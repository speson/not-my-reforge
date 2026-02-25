// intent-gate.ts — Detect and warn about potentially destructive user requests
// Event: UserPromptSubmit
import { readStdin, writeOutput } from "../lib/io.js";
import { analyzeIntent, formatIntentWarning } from "../lib/intent/detector.js";
async function main() {
    const input = await readStdin();
    const prompt = input.prompt?.trim() || "";
    if (!prompt)
        process.exit(0);
    // Skip reforge commands — they have their own handling
    if (prompt.toLowerCase().startsWith("reforge "))
        process.exit(0);
    const analysis = analyzeIntent(prompt);
    if (!analysis.isDestructive)
        process.exit(0);
    // Only inject warning context for medium+ risk
    if (analysis.riskLevel === "low")
        process.exit(0);
    const warning = formatIntentWarning(analysis);
    writeOutput({
        hookSpecificOutput: {
            hookEventName: "PostToolUse",
            additionalContext: [
                warning,
                "",
                "Before proceeding:",
                "- Confirm the user's intent explicitly",
                "- Suggest safer alternatives if available",
                "- Ensure backups exist for critical operations",
                analysis.riskLevel === "critical"
                    ? "- For CRITICAL operations: refuse unless user provides explicit confirmation with scope"
                    : "",
            ]
                .filter(Boolean)
                .join("\n"),
        },
    });
}
main();
