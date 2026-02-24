// ralph-compact.ts — Preserve Ralph Loop state through context compaction
// Event: PreCompact
import { readStdin, writeOutput } from "../lib/io.js";
import { loadRalphState } from "../lib/ralph/state.js";
import { formatRalphContext, getAdaptationStrategy } from "../lib/ralph/state.js";
async function main() {
    const input = await readStdin();
    const cwd = input.cwd;
    if (!cwd)
        process.exit(0);
    const state = loadRalphState(cwd);
    if (!state || !state.active)
        process.exit(0);
    // Inject Ralph state as systemMessage so it survives compaction
    const strategy = getAdaptationStrategy(state);
    const systemMessage = [
        "=== RALPH LOOP STATE (MUST NOT FORGET) ===",
        formatRalphContext(state),
        "",
        strategy,
        "",
        "IMPORTANT: You are in an active Ralph Loop. Continue working on the task.",
        "Signal [RALPH:DONE] when the task is complete and verified.",
        "To cancel: reforge ralph-cancel",
        "===========================================",
    ].join("\n");
    writeOutput({
        hookSpecificOutput: {
            hookEventName: "PreCompact",
            systemMessage,
        },
    });
}
main();
