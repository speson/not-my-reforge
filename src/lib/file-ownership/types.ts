// File ownership types — prevent parallel agent file conflicts

export interface FileLock {
  filePath: string;
  owner: string; // agent ID or session ID
  acquiredAt: number;
  expiresAt: number; // auto-expire stale locks
}

export interface OwnershipRegistry {
  locks: FileLock[];
  lastUpdated: string;
}

export const LOCK_TTL_MS = 5 * 60 * 1000; // 5 minutes auto-expire

export const EMPTY_REGISTRY: OwnershipRegistry = {
  locks: [],
  lastUpdated: new Date().toISOString(),
};
