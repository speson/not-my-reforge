export function createTeamState(sessionName, baseBranch, taskDescription, workerCount) {
    const workers = [];
    const timestamp = Date.now();
    for (let i = 1; i <= workerCount; i++) {
        workers.push({
            id: i,
            name: `worker-${i}`,
            branch: `spawn/${sessionName}/${i}-${timestamp}`,
            worktreePath: `/tmp/claude-worktrees/${sessionName}/agent-${i}`,
            status: "pending",
            taskDescription: "",
            modifiedFiles: [],
            completedAt: null,
        });
    }
    return {
        active: true,
        sessionName,
        baseBranch,
        taskDescription,
        workers,
        reviewer: null,
        stage: "planning",
        createdAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
    };
}
