// Ralph Loop state persistence in .reforge/ralph-state.json
import { readDataFile, writeDataFile } from "../storage.js";
const FILENAME = "ralph-state.json";
export function loadRalphState(cwd) {
    const state = readDataFile(cwd, FILENAME, null);
    if (!state || !state.active)
        return null;
    return state;
}
export function saveRalphState(cwd, state) {
    writeDataFile(cwd, FILENAME, state);
}
export function clearRalphState(cwd) {
    writeDataFile(cwd, FILENAME, { active: false });
}
export function advanceIteration(state) {
    state.iteration += 1;
    state.lastIterationAt = new Date().toISOString();
}
export function recordFailure(state, reason) {
    state.consecutiveFailures += 1;
    state.lastFailureReason = reason;
}
export function recordSuccess(state) {
    state.consecutiveFailures = 0;
    state.status = "success";
    state.active = false;
}
export function recordApproach(state, approach) {
    state.approaches.push(approach);
    // Keep last 10 approaches only
    if (state.approaches.length > 10) {
        state.approaches = state.approaches.slice(-10);
    }
}
export function isExhausted(state) {
    return state.iteration >= state.maxIterations;
}
export function getAdaptationStrategy(state) {
    const iter = state.iteration;
    const failures = state.consecutiveFailures;
    if (failures >= 5) {
        return [
            `[Ralph: ${failures} consecutive failures — ESCALATION]`,
            "You have failed the same way too many times.",
            "STOP your current approach entirely.",
            "Options:",
            "1. Ask the user for guidance on how to proceed",
            "2. Simplify the task — find the absolute minimum viable change",
            "3. Break the task into smaller, independently verifiable pieces",
            "",
            `Previous approaches tried: ${state.approaches.slice(-3).join(", ") || "none recorded"}`,
        ].join("\n");
    }
    if (iter <= 3) {
        return [
            `[Ralph: Iteration ${iter}/${state.maxIterations} — straightforward]`,
            "Try the direct, obvious fix. Don't overthink it.",
            state.lastFailureReason ? `Last failure: ${state.lastFailureReason}` : "",
        ].filter(Boolean).join("\n");
    }
    if (iter <= 7) {
        return [
            `[Ralph: Iteration ${iter}/${state.maxIterations} — reassess]`,
            "The straightforward approach isn't working.",
            "1. Re-read all relevant files from scratch",
            "2. Reconsider your assumptions — what are you missing?",
            "3. Try a fundamentally different approach",
            state.lastFailureReason ? `Last failure: ${state.lastFailureReason}` : "",
            state.approaches.length > 0 ? `Tried so far: ${state.approaches.join(", ")}` : "",
        ].filter(Boolean).join("\n");
    }
    if (iter <= 12) {
        return [
            `[Ralph: Iteration ${iter}/${state.maxIterations} — lateral thinking]`,
            "Multiple approaches have failed. Think laterally:",
            "1. Is the problem actually somewhere else? (wrong file, wrong assumption)",
            "2. Can you work around the issue instead of fixing it head-on?",
            "3. Check git history — was this working before? What changed?",
            "4. Search the codebase for similar patterns that DO work",
            state.approaches.length > 0 ? `Failed approaches: ${state.approaches.join(", ")}` : "",
        ].filter(Boolean).join("\n");
    }
    return [
        `[Ralph: Iteration ${iter}/${state.maxIterations} — minimum viable]`,
        "You're running low on iterations. Find the SIMPLEST possible fix:",
        "1. What is the absolute minimum change that makes this work?",
        "2. Skip elegance — focus only on correctness",
        "3. If the original scope is too large, solve just the core issue",
        `${state.maxIterations - iter} iterations remaining.`,
    ].join("\n");
}
export function formatRalphContext(state) {
    const sections = [
        `[Ralph Loop Active]`,
        `Task: ${state.task}`,
        `Iteration: ${state.iteration}/${state.maxIterations}`,
        `Status: ${state.status}`,
        `Consecutive failures: ${state.consecutiveFailures}`,
    ];
    if (state.verifyCommand) {
        sections.push(`Verify command: ${state.verifyCommand}`);
    }
    if (state.approaches.length > 0) {
        sections.push(`Approaches tried: ${state.approaches.join(", ")}`);
    }
    if (state.lastFailureReason) {
        sections.push(`Last failure: ${state.lastFailureReason}`);
    }
    return sections.join("\n");
}
