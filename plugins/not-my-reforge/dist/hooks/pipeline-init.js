// pipeline-init.ts — Initialize and manage pipeline mode
// Event: UserPromptSubmit
import { readStdin, writeOutput } from "../lib/io.js";
import { loadPipelineState, savePipelineState, advanceStage, formatPipelineContext, formatPipelineStatus, } from "../lib/pipeline/state.js";
import { createPipelineState } from "../lib/pipeline/types.js";
async function main() {
    const input = await readStdin();
    const cwd = input.cwd;
    const prompt = input.user_prompt?.trim() || "";
    if (!cwd || !prompt)
        process.exit(0);
    // Handle "reforge pipeline <goal>"
    const pipelineMatch = prompt.match(/^reforge\s+pipeline\s+(.+)/i);
    if (pipelineMatch) {
        const goal = pipelineMatch[1].trim();
        const existing = loadPipelineState(cwd);
        if (existing) {
            writeOutput({
                hookSpecificOutput: {
                    hookEventName: "PostToolUse",
                    additionalContext: [
                        "Pipeline already active.",
                        formatPipelineStatus(existing),
                        "",
                        'To cancel: say "reforge cancel"',
                    ].join("\n"),
                },
            });
            return;
        }
        const state = createPipelineState(goal);
        savePipelineState(cwd, state);
        writeOutput({
            hookSpecificOutput: {
                hookEventName: "PostToolUse",
                additionalContext: [
                    "=== PIPELINE MODE ACTIVATED ===",
                    formatPipelineContext(state),
                ].join("\n"),
            },
        });
        return;
    }
    // Detect stage completion signals
    const state = loadPipelineState(cwd);
    if (!state)
        process.exit(0);
    const upperPrompt = prompt.toUpperCase();
    if (upperPrompt.includes("[PLAN COMPLETE]") && state.currentStage === "plan") {
        // Save the plan from context (agent should have written it)
        state.plan = prompt.replace(/\[PLAN COMPLETE\]/i, "").trim() || state.plan;
        advanceStage(state);
        savePipelineState(cwd, state);
    }
    else if (upperPrompt.includes("[IMPLEMENT COMPLETE]") && state.currentStage === "implement") {
        advanceStage(state);
        savePipelineState(cwd, state);
    }
    else if (upperPrompt.includes("[FIX COMPLETE]") && state.currentStage === "fix") {
        state.currentStage = "verify"; // Go back to verify
        savePipelineState(cwd, state);
    }
    else if (upperPrompt.includes("[VERIFY COMPLETE]") && state.currentStage === "verify") {
        advanceStage(state);
        savePipelineState(cwd, state);
    }
    else if (upperPrompt.includes("[REVIEW COMPLETE]") && state.currentStage === "review") {
        state.currentStage = "done";
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
        return;
    }
    // Inject pipeline context for active pipeline
    if (state.active) {
        writeOutput({
            hookSpecificOutput: {
                hookEventName: "PostToolUse",
                additionalContext: formatPipelineContext(state),
            },
        });
    }
}
main();
