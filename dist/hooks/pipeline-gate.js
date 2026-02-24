// pipeline-gate.ts — Run stage gates and control pipeline flow
// Event: Stop
import { readStdin, writeError, writeOutput } from "../lib/io.js";
import { loadPipelineState, savePipelineState, runGates, revertToFix, shouldAbortFix, advanceStage, formatPipelineStatus, formatPipelineContext, } from "../lib/pipeline/state.js";
async function main() {
    const input = await readStdin();
    const cwd = input.cwd;
    if (!cwd)
        process.exit(0);
    const state = loadPipelineState(cwd);
    if (!state)
        process.exit(0);
    const currentStage = state.stages.find((s) => s.name === state.currentStage);
    // If in verify stage with gates, run them
    if (state.currentStage === "verify" && currentStage && currentStage.gates.length > 0) {
        const result = runGates(cwd, currentStage.gates);
        state.history.push(result);
        if (!result.passed) {
            // Check if we've exceeded max fix attempts
            if (shouldAbortFix(state)) {
                state.active = false;
                savePipelineState(cwd, state);
                writeOutput({
                    hookSpecificOutput: {
                        hookEventName: "PostToolUse",
                        additionalContext: [
                            "=== PIPELINE ABORTED ===",
                            `Exceeded max fix attempts (${state.maxFixAttempts}).`,
                            "",
                            formatPipelineStatus(state),
                            "",
                            "Please review the failures and fix manually.",
                        ].join("\n"),
                    },
                });
                return;
            }
            // Revert to fix stage
            revertToFix(state);
            savePipelineState(cwd, state);
            const failedGates = result.gateResults.filter((r) => !r.passed);
            writeError([
                `Pipeline: Verification failed. Moving to fix stage (attempt ${state.fixAttempts}/${state.maxFixAttempts}).`,
                "",
                "Failed gates:",
                ...failedGates.map((f) => `  - ${f.label}: ${f.output.split("\n")[0]}`),
                "",
                formatPipelineContext(state),
            ].join("\n"));
            process.exit(2); // Continue working — fix the issues
        }
        // All gates passed — advance to review
        advanceStage(state);
        savePipelineState(cwd, state);
    }
    // If pipeline is still active and not done, keep going
    if (state.active && state.currentStage !== "done") {
        savePipelineState(cwd, state);
        writeError([
            `Pipeline: Stage "${state.currentStage}" — continuing.`,
            "",
            formatPipelineContext(state),
        ].join("\n"));
        process.exit(2); // Continue working
    }
    // Pipeline done or inactive
    if (state.currentStage === "done") {
        state.active = false;
        savePipelineState(cwd, state);
        writeOutput({
            hookSpecificOutput: {
                hookEventName: "PostToolUse",
                additionalContext: [
                    "=== PIPELINE COMPLETE ===",
                    formatPipelineStatus(state),
                ].join("\n"),
            },
        });
    }
}
main();
