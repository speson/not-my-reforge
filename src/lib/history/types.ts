// Session history types

export interface SessionRecord {
  sessionId: string;
  startedAt: string;
  endedAt: string;
  durationSec: number;
  project: string;
  branch: string;
  /** Active mode during session (normal, ralph, autopilot, pipeline, team) */
  mode: string;
  toolCalls: number;
  failures: number;
  filesModified: number;
  agentsSpawned: number;
  estimatedTokens: number;
  /** Outcome: completed, aborted, compacted */
  outcome: "completed" | "aborted" | "compacted" | "unknown";
}

export interface SessionHistory {
  records: SessionRecord[];
  /** Max records to keep */
  maxRecords: number;
}

export const DEFAULT_HISTORY: SessionHistory = {
  records: [],
  maxRecords: 100,
};
