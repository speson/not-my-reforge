// Mode registry types — central mode state management
// Modes that cannot run simultaneously
export const MODE_CONFLICTS = {
    ralph: ["autopilot", "pipeline", "qa", "ralplan"],
    autopilot: ["ralph", "pipeline", "qa", "ralplan"],
    pipeline: ["ralph", "autopilot", "qa", "ralplan"],
    team: [], // team can coexist with orchestration modes
    swarm: [], // swarm can coexist with orchestration modes
    qa: ["ralph", "autopilot", "pipeline", "ralplan"],
    ralplan: ["ralph", "autopilot", "pipeline", "qa"],
};
export const CANCEL_TTL_MS = 30_000; // 30 seconds
export const EMPTY_REGISTRY = {
    activeMode: null,
    cancelSentinel: null,
    history: [],
};
