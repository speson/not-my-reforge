export interface RalphState {
  active: boolean;
  task: string;
  verifyCommand: string | null;
  iteration: number;
  maxIterations: number;
  status: "running" | "success" | "failed" | "aborted";
  consecutiveFailures: number;
  lastFailureReason: string;
  approaches: string[];
  startedAt: string;
  lastIterationAt: string;
}

export interface RalphBackoff {
  baseDelayMs: number;
  multiplier: number;
  maxConsecutiveFailures: number;
  cooldownAfterMaxMs: number;
}

export const DEFAULT_BACKOFF: RalphBackoff = {
  baseDelayMs: 0,       // no actual sleep in hooks — we use exit 2 blocking
  multiplier: 2,
  maxConsecutiveFailures: 5,
  cooldownAfterMaxMs: 0,
};

export function createRalphState(
  task: string,
  maxIterations: number = 20,
  verifyCommand: string | null = null
): RalphState {
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
