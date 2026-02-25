// swarm-init.ts — Initialize and manage swarm mode
// Event: UserPromptSubmit
import { readStdin, writeOutput } from "../lib/io.js";
import { loadSwarmState, saveSwarmState, isSwarmComplete, formatSwarmContext, formatSwarmStatus, formatSwarmReport, } from "../lib/swarm/state.js";
import { createSwarmState } from "../lib/swarm/types.js";
async function main() {
    const input = await readStdin();
    const cwd = input.cwd;
    const prompt = input.prompt?.trim() || "";
    if (!cwd || !prompt)
        process.exit(0);
    // Handle "reforge swarm <goal>"
    const swarmMatch = prompt.match(/^reforge\s+swarm\s+(.+)/i);
    if (swarmMatch) {
        const goal = swarmMatch[1].trim();
        const existing = loadSwarmState(cwd);
        if (existing) {
            writeOutput({
                hookSpecificOutput: {
                    hookEventName: "PostToolUse",
                    additionalContext: [
                        "Swarm already active.",
                        formatSwarmStatus(existing),
                        "",
                        'To cancel: say "reforge cancel"',
                    ].join("\n"),
                },
            });
            return;
        }
        // Parse concurrency
        const concMatch = prompt.match(/--concurrency\s+(\d+)/i);
        const concurrency = concMatch ? parseInt(concMatch[1], 10) : 3;
        // Create swarm — agent will define tasks in planning phase
        const state = createSwarmState(goal, [], { concurrency });
        saveSwarmState(cwd, state);
        writeOutput({
            hookSpecificOutput: {
                hookEventName: "PostToolUse",
                additionalContext: [
                    "=== SWARM MODE ACTIVATED ===",
                    `Goal: ${goal}`,
                    `Concurrency: ${concurrency}`,
                    "",
                    "Please decompose the goal into independent research/analysis tasks.",
                    "For each task, specify:",
                    "  1. Description of what to investigate",
                    "  2. Agent type (explore, oracle, reviewer, librarian)",
                    "  3. Model tier (haiku for fast, sonnet for balanced, opus for deep)",
                    "",
                    "Then dispatch each task using the Task tool in parallel.",
                    "When all tasks complete, aggregate the results into a summary.",
                    "",
                    "Swarm is ideal for:",
                    "  - Parallel codebase exploration (search multiple areas)",
                    "  - Multi-perspective analysis (different agents analyze same problem)",
                    "  - Bulk file processing (apply same operation to many files)",
                ].join("\n"),
            },
        });
        return;
    }
    // Inject context if swarm is active
    const state = loadSwarmState(cwd);
    if (!state)
        process.exit(0);
    if (isSwarmComplete(state)) {
        state.active = false;
        saveSwarmState(cwd, state);
        writeOutput({
            hookSpecificOutput: {
                hookEventName: "PostToolUse",
                additionalContext: [
                    "=== SWARM COMPLETE ===",
                    formatSwarmReport(state),
                ].join("\n"),
            },
        });
        return;
    }
    writeOutput({
        hookSpecificOutput: {
            hookEventName: "PostToolUse",
            additionalContext: formatSwarmContext(state),
        },
    });
}
main();
