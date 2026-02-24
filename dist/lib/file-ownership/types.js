// File ownership types — prevent parallel agent file conflicts
export const LOCK_TTL_MS = 5 * 60 * 1000; // 5 minutes auto-expire
export const EMPTY_REGISTRY = {
    locks: [],
    lastUpdated: new Date().toISOString(),
};
