// Autopilot mode types — autonomous task execution with safety rails

export type AutopilotPhase = "planning" | "executing" | "verifying" | "completed" | "paused" | "aborted";

export interface AutopilotTask {
  id: number;
  description: string;
  status: "pending" | "in_progress" | "done" | "failed" | "skipped";
  acceptanceCriteria: string[];
  completedAt: string | null;
  error: string | null;
}

export interface AutopilotConfig {
  /** Max tasks to execute before pausing for user review */
  maxTasksBeforeReview: number;
  /** Max consecutive failures before stopping */
  maxConsecutiveFailures: number;
  /** Run verification after each task */
  verifyAfterEach: boolean;
  /** Verification command (e.g., "npm test") */
  verifyCommand: string | null;
  /** Auto-commit after each task */
  autoCheckpoint: boolean;
}

export interface AutopilotState {
  active: boolean;
  phase: AutopilotPhase;
  goal: string;
  tasks: AutopilotTask[];
  currentTaskId: number | null;
  config: AutopilotConfig;
  tasksCompletedSinceReview: number;
  consecutiveFailures: number;
  startedAt: string;
  lastActivityAt: string;
}

export const DEFAULT_AUTOPILOT_CONFIG: AutopilotConfig = {
  maxTasksBeforeReview: 5,
  maxConsecutiveFailures: 3,
  verifyAfterEach: true,
  verifyCommand: null,
  autoCheckpoint: false,
};

export function createAutopilotState(
  goal: string,
  tasks: Array<{ description: string; acceptanceCriteria?: string[] }>,
  config?: Partial<AutopilotConfig>
): AutopilotState {
  const now = new Date().toISOString();
  return {
    active: true,
    phase: "planning",
    goal,
    tasks: tasks.map((t, i) => ({
      id: i + 1,
      description: t.description,
      status: "pending",
      acceptanceCriteria: t.acceptanceCriteria || [],
      completedAt: null,
      error: null,
    })),
    currentTaskId: null,
    config: { ...DEFAULT_AUTOPILOT_CONFIG, ...config },
    tasksCompletedSinceReview: 0,
    consecutiveFailures: 0,
    startedAt: now,
    lastActivityAt: now,
  };
}
