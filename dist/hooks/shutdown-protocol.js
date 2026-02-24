// shutdown-protocol.ts — Structured shutdown with orphan detection
// Event: Stop (async)
import { readStdin, writeOutput } from "../lib/io.js";
import { runFullDetection, formatShutdownReport } from "../lib/shutdown/detector.js";
async function main() {
    const input = await readStdin();
    const cwd = input.cwd;
    if (!cwd)
        process.exit(0);
    const findings = runFullDetection(cwd);
    if (findings.length === 0)
        process.exit(0);
    writeOutput({
        hookSpecificOutput: {
            hookEventName: "PostToolUse",
            additionalContext: formatShutdownReport(findings),
        },
    });
}
main();
