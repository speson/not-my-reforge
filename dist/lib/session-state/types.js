export function createDefaultState() {
    return {
        mode: "normal",
        activeTeam: null,
        pendingTasks: [],
        lastCheckpoint: new Date().toISOString(),
        sessionId: "",
    };
}
