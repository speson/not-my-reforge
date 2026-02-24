// Session metrics and HUD types
export const EMPTY_METRICS = {
    sessionId: "",
    startedAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    toolCalls: {},
    totalToolCalls: 0,
    totalFailures: 0,
    agentsSpawned: 0,
    filesModified: [],
    estimatedTokens: 0,
};
/** Context window thresholds */
export const CONTEXT_THRESHOLDS = {
    /** Warn at 60% estimated usage */
    warn: 0.6,
    /** Critical at 80% */
    critical: 0.8,
    /** Rough max tokens for Opus/Sonnet context */
    maxTokens: 200000,
};
