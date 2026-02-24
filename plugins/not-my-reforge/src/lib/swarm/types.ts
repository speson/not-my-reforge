// Swarm mode types — lightweight parallel multi-agent execution

export type SwarmTaskStatus = "pending" | "assigned" | "done" | "failed";

export interface SwarmTask {
  id: number;
  description: string;
  status: SwarmTaskStatus;
  /** Agent type to use (explore, oracle, reviewer, etc.) */
  agentType: string;
  /** Model tier preference */
  modelTier: "haiku" | "sonnet" | "opus";
  result: string | null;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

export interface SwarmConfig {
  /** Max concurrent agents */
  concurrency: number;
  /** Aggregate results at the end */
  aggregateResults: boolean;
  /** Fail fast on first failure */
  failFast: boolean;
  /** Timeout per task in seconds */
  taskTimeoutSec: number;
}

export interface SwarmState {
  active: boolean;
  goal: string;
  tasks: SwarmTask[];
  config: SwarmConfig;
  startedAt: string;
  lastActivityAt: string;
}

export const DEFAULT_SWARM_CONFIG: SwarmConfig = {
  concurrency: 3,
  aggregateResults: true,
  failFast: false,
  taskTimeoutSec: 300,
};

export function createSwarmState(
  goal: string,
  tasks: Array<{ description: string; agentType?: string; modelTier?: SwarmTask["modelTier"] }>,
  config?: Partial<SwarmConfig>
): SwarmState {
  const now = new Date().toISOString();
  return {
    active: true,
    goal,
    tasks: tasks.map((t, i) => ({
      id: i + 1,
      description: t.description,
      status: "pending",
      agentType: t.agentType || "explore",
      modelTier: t.modelTier || "sonnet",
      result: null,
      error: null,
      startedAt: null,
      completedAt: null,
    })),
    config: { ...DEFAULT_SWARM_CONFIG, ...config },
    startedAt: now,
    lastActivityAt: now,
  };
}
