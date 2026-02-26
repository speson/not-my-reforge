// Progressive Trust tracker — manages trust level progression based on session behavior
import { readDataFile, writeDataFile } from "../storage.js";
const TRUST_FILE = "trust-state.json";
// Threshold: consecutive Edit/Write successes needed to reach level 1
const SUCCESSES_FOR_LEVEL_1 = 5;
const DEFAULT_STATE = {
    level: 0,
    consecutiveSuccesses: 0,
    buildPassed: false,
    testsPassed: false,
    sessionId: "",
    updatedAt: new Date().toISOString(),
};
export function loadTrustState(cwd) {
    return readDataFile(cwd, TRUST_FILE, { ...DEFAULT_STATE });
}
function saveTrustState(cwd, state) {
    state.updatedAt = new Date().toISOString();
    writeDataFile(cwd, TRUST_FILE, state);
}
/**
 * Record a successful Edit or Write operation.
 * Increments consecutiveSuccesses; level 0→1 after 5 consecutive successes.
 */
export function recordSuccess(cwd, toolName) {
    if (toolName !== "Edit" && toolName !== "Write") {
        return loadTrustState(cwd);
    }
    const state = loadTrustState(cwd);
    state.consecutiveSuccesses += 1;
    // Level 0 → 1 after SUCCESSES_FOR_LEVEL_1 consecutive successes
    if (state.level === 0 && state.consecutiveSuccesses >= SUCCESSES_FOR_LEVEL_1) {
        state.level = 1;
    }
    saveTrustState(cwd, state);
    return state;
}
/**
 * Record a failure for any tracked tool.
 * Resets consecutiveSuccesses but does NOT reduce level.
 */
export function recordFailure(cwd) {
    const state = loadTrustState(cwd);
    state.consecutiveSuccesses = 0;
    saveTrustState(cwd, state);
    return state;
}
/**
 * Record a successful build pass (npm run build).
 * Advances level 1 → 2 if eligible.
 */
export function recordBuildPass(cwd) {
    const state = loadTrustState(cwd);
    state.buildPassed = true;
    // Level 1 → 2 when build passes
    if (state.level === 1) {
        state.level = 2;
    }
    saveTrustState(cwd, state);
    return state;
}
/**
 * Record a successful test pass (npm test).
 * Advances level 2 → 3 if eligible.
 */
export function recordTestPass(cwd) {
    const state = loadTrustState(cwd);
    state.testsPassed = true;
    // Level 2 → 3 when tests pass
    if (state.level === 2) {
        state.level = 3;
    }
    saveTrustState(cwd, state);
    return state;
}
/**
 * Get the current trust level (0-3).
 */
export function getTrustLevel(cwd) {
    return loadTrustState(cwd).level;
}
const LEVEL_NAMES = {
    0: "strict",
    1: "familiar",
    2: "trusted",
    3: "autonomous",
};
/**
 * Format a human-readable trust status summary.
 */
export function formatTrustStatus(cwd) {
    const state = loadTrustState(cwd);
    const { level, consecutiveSuccesses, buildPassed, testsPassed } = state;
    const lines = [
        "=== Progressive Trust ===",
        "",
        `Current level: ${level} (${LEVEL_NAMES[level]})`,
    ];
    // Show progression info based on current level
    if (level === 0) {
        lines.push(`Consecutive successes: ${consecutiveSuccesses}/${SUCCESSES_FOR_LEVEL_1} (next: ${SUCCESSES_FOR_LEVEL_1} successful Edit/Write ops)`);
    }
    else if (level === 1) {
        lines.push(`Next: build pass (npm run build) — build passed: ${buildPassed ? "yes" : "no"}`);
    }
    else if (level === 2) {
        lines.push(`Next: test pass (npm test) — tests passed: ${testsPassed ? "yes" : "no"}`);
    }
    else {
        lines.push("Maximum trust level reached.");
    }
    lines.push("", "Levels:", `  0 (strict)     — All operations need approval${level === 0 ? " [CURRENT]" : ""}`, `  1 (familiar)   — Edit auto-approved${level === 1 ? " [CURRENT]" : ""}`, `  2 (trusted)    — Write + build/test auto-approved${level === 2 ? " [CURRENT]" : ""}`, `  3 (autonomous) — Most operations auto-approved${level === 3 ? " [CURRENT]" : ""}`);
    return lines.join("\n");
}
