// Swarm mode types — lightweight parallel multi-agent execution
export const DEFAULT_SWARM_CONFIG = {
    concurrency: 3,
    aggregateResults: true,
    failFast: false,
    taskTimeoutSec: 300,
};
export function createSwarmState(goal, tasks, config) {
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
