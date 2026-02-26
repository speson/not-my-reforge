// failure-tracker.ts — Track consecutive failures and suggest escalation
// Event: PostToolUse (on failure)
import { readStdin, writeOutput } from "../lib/io.js";
import { recordFailure, recordSuccess } from "../lib/circuit-breaker/tracker.js";
import { getRecoveryStrategy } from "../lib/failure-playbook/strategies.js";
async function main() {
    const input = await readStdin();
    const cwd = input.cwd;
    const toolName = input.tool_name;
    if (!cwd || !toolName)
        process.exit(0);
    const isError = input.tool_response?.is_error;
    if (!isError) {
        recordSuccess(cwd, toolName);
        process.exit(0);
    }
    const errorMsg = input.tool_response?.content ||
        input.tool_response?.error ||
        "Unknown error";
    const { escalation } = recordFailure(cwd, toolName, errorMsg);
    const strategy = getRecoveryStrategy(toolName, errorMsg);
    const contextParts = [];
    if (escalation) {
        contextParts.push(`[Circuit Breaker] ${escalation}`);
    }
    if (strategy) {
        const tryCommands = strategy.commands.map((cmd) => `Try: ${cmd}`).join("\n");
        contextParts.push(`[Failure Playbook] ${strategy.errorType} detected\nSuggestion: ${strategy.suggestion}\n${tryCommands}`);
    }
    if (contextParts.length > 0) {
        writeOutput({
            hookSpecificOutput: {
                hookEventName: "PostToolUse",
                additionalContext: contextParts.join("\n\n"),
            },
        });
    }
}
main();
