export const DEFAULT_BACKOFF = {
    baseDelayMs: 0, // no actual sleep in hooks — we use exit 2 blocking
    multiplier: 2,
    maxConsecutiveFailures: 5,
    cooldownAfterMaxMs: 0,
};
export function createRalphState(task, maxIterations = 20, verifyCommand = null) {
    return {
        active: true,
        task,
        verifyCommand,
        iteration: 0,
        maxIterations,
        status: "running",
        consecutiveFailures: 0,
        lastFailureReason: "",
        approaches: [],
        startedAt: new Date().toISOString(),
        lastIterationAt: new Date().toISOString(),
    };
}
