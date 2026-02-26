// Session metrics and HUD types

export interface ToolCallStat {
  tool: string;
  count: number;
  failures: number;
  lastUsedAt: string;
}

export interface SessionMetrics {
  sessionId: string;
  startedAt: string;
  lastActivityAt: string;
  toolCalls: Record<string, ToolCallStat>;
  totalToolCalls: number;
  totalFailures: number;
  agentsSpawned: number;
  filesModified: string[];
  /** Estimated context tokens used (rough heuristic) */
  estimatedTokens: number;
}

export interface HudState {
  sessionDuration: string;
  toolCallCount: number;
  failureCount: number;
  agentCount: number;
  activeMode: string;
  lastTool: string;
  contextUsage: string;
}

export const EMPTY_METRICS: SessionMetrics = {
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
  /** Urgent at 85% — strong compaction pressure */
  urgent: 0.85,
  /** Rough max tokens for Opus/Sonnet context */
  maxTokens: 200000,
} as const;
