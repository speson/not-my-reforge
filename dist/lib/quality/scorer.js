// Quality score tracking — session-scoped edit/build/test/cleanliness metrics
import { readDataFile, writeDataFile } from "../storage.js";
const FILENAME = "quality-score.json";
const WEIGHTS = {
    editSuccessRate: 0.30,
    buildHealth: 0.25,
    testHealth: 0.25,
    codeCleanness: 0.20,
};
const DEFAULT_STATE = {
    totalEdits: 0,
    successfulEdits: 0,
    buildPassed: null,
    testsPassed: null,
    slopComments: 0,
    sessionId: "",
    updatedAt: new Date().toISOString(),
};
export function loadQualityScore(cwd) {
    return readDataFile(cwd, FILENAME, { ...DEFAULT_STATE });
}
function saveQualityScore(cwd, state) {
    state.updatedAt = new Date().toISOString();
    writeDataFile(cwd, FILENAME, state);
}
export function recordEditResult(cwd, success) {
    const state = loadQualityScore(cwd);
    state.totalEdits += 1;
    if (success) {
        state.successfulEdits += 1;
    }
    saveQualityScore(cwd, state);
}
export function recordBuildResult(cwd, passed) {
    const state = loadQualityScore(cwd);
    state.buildPassed = passed;
    saveQualityScore(cwd, state);
}
export function recordTestResult(cwd, passed) {
    const state = loadQualityScore(cwd);
    state.testsPassed = passed;
    saveQualityScore(cwd, state);
}
export function recordSlopComment(cwd) {
    const state = loadQualityScore(cwd);
    state.slopComments += 1;
    saveQualityScore(cwd, state);
}
function computeComponents(state) {
    // Edit success rate: (successful / total) * 100, 50 if no edits yet
    const editSuccessRate = state.totalEdits === 0
        ? 50
        : Math.round((state.successfulEdits / state.totalEdits) * 100);
    // Build health: 100 pass, 0 fail, 50 not run
    const buildHealth = state.buildPassed === null ? 50 : state.buildPassed ? 100 : 0;
    // Test health: 100 pass, 0 fail, 50 not run
    const testHealth = state.testsPassed === null ? 50 : state.testsPassed ? 100 : 0;
    // Code cleanness: 100 - (slop comments * 10), min 0
    const codeCleanness = Math.max(0, 100 - state.slopComments * 10);
    // Weighted overall
    const overall = Math.round(editSuccessRate * WEIGHTS.editSuccessRate +
        buildHealth * WEIGHTS.buildHealth +
        testHealth * WEIGHTS.testHealth +
        codeCleanness * WEIGHTS.codeCleanness);
    return { editSuccessRate, buildHealth, testHealth, codeCleanness, overall };
}
export function calculateScore(cwd) {
    const state = loadQualityScore(cwd);
    return computeComponents(state);
}
export function formatScoreReport(cwd) {
    const state = loadQualityScore(cwd);
    const scores = computeComponents(state);
    const editDetail = state.totalEdits === 0
        ? "no edits yet"
        : `${state.successfulEdits}/${state.totalEdits} successful`;
    const buildDetail = state.buildPassed === null
        ? "not run yet"
        : state.buildPassed
            ? "passing"
            : "failing";
    const testDetail = state.testsPassed === null
        ? "not run yet"
        : state.testsPassed
            ? "passing"
            : "failing";
    const cleanDetail = state.slopComments === 0
        ? "clean"
        : `${state.slopComments} slop comment${state.slopComments === 1 ? "" : "s"}`;
    // Build a tip based on lowest-scoring component
    const components = [
        ["editSuccessRate", scores.editSuccessRate],
        ["buildHealth", scores.buildHealth],
        ["testHealth", scores.testHealth],
        ["codeCleanness", scores.codeCleanness],
    ];
    const [worstKey, worstScore] = components.reduce((a, b) => (b[1] < a[1] ? b : a));
    const TIPS = {
        editSuccessRate: "Review edits carefully before applying to reduce failures.",
        buildHealth: "Fix build errors to improve your score.",
        testHealth: "Run tests to improve your score.",
        codeCleanness: "Remove unnecessary comments and boilerplate to improve cleanliness.",
    };
    const tip = worstScore < 100 ? TIPS[worstKey] : "All components are at full score. Keep it up!";
    const pad = (n) => String(n).padStart(3);
    const lines = [
        `=== Quality Score: ${scores.overall}/100 ===`,
        "",
        `Edit Success:  ${pad(scores.editSuccessRate)}/100 (${editDetail})`,
        `Build Health:  ${pad(scores.buildHealth)}/100 (${buildDetail})`,
        `Test Health:   ${pad(scores.testHealth)}/100 (${testDetail})`,
        `Code Clean:    ${pad(scores.codeCleanness)}/100 (${cleanDetail})`,
        "",
        `Tip: ${tip}`,
    ];
    return lines.join("\n");
}
