// Autopilot mode types — autonomous task execution with safety rails
export const DEFAULT_AUTOPILOT_CONFIG = {
    maxTasksBeforeReview: 5,
    maxConsecutiveFailures: 3,
    verifyAfterEach: true,
    verifyCommand: null,
    autoCheckpoint: false,
};
export function createAutopilotState(goal, tasks, config) {
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
