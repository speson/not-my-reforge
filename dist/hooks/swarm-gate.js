// swarm-gate.ts — Check swarm completion and aggregate results
// Event: Stop
import { readStdin, writeError, writeOutput } from "../lib/io.js";
import { loadSwarmState, saveSwarmState, isSwarmComplete, formatSwarmReport, formatSwarmContext, } from "../lib/swarm/state.js";
async function main() {
    const input = await readStdin();
    const cwd = input.cwd;
    if (!cwd)
        process.exit(0);
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
    // Still has pending/assigned tasks — continue
    const pending = state.tasks.filter((t) => t.status === "pending").length;
    const assigned = state.tasks.filter((t) => t.status === "assigned").length;
    if (pending > 0 || assigned > 0) {
        writeError([
            `Swarm: ${pending} pending, ${assigned} active — tasks still in progress.`,
            "",
            formatSwarmContext(state),
        ].join("\n"));
        process.exit(2); // Keep working
    }
}
main();
