// File ownership registry — acquire, release, and check file locks
import { readDataFile, writeDataFile } from "../storage.js";
import { LOCK_TTL_MS, EMPTY_REGISTRY } from "./types.js";
const REGISTRY_FILE = "file-locks.json";
export function loadRegistry(cwd) {
    const registry = readDataFile(cwd, REGISTRY_FILE, {
        ...EMPTY_REGISTRY,
        locks: [],
    });
    // Prune expired locks
    const now = Date.now();
    registry.locks = registry.locks.filter((lock) => lock.expiresAt > now);
    return registry;
}
function saveRegistry(cwd, registry) {
    registry.lastUpdated = new Date().toISOString();
    writeDataFile(cwd, REGISTRY_FILE, registry);
}
export function acquireLock(cwd, filePath, owner, ttlMs = LOCK_TTL_MS) {
    const registry = loadRegistry(cwd);
    const normalized = normalizePath(cwd, filePath);
    const existing = registry.locks.find((l) => l.filePath === normalized);
    if (existing) {
        // Same owner can re-acquire (extend)
        if (existing.owner === owner) {
            existing.expiresAt = Date.now() + ttlMs;
            saveRegistry(cwd, registry);
            return { success: true };
        }
        return { success: false, existingOwner: existing.owner };
    }
    registry.locks.push({
        filePath: normalized,
        owner,
        acquiredAt: Date.now(),
        expiresAt: Date.now() + ttlMs,
    });
    saveRegistry(cwd, registry);
    return { success: true };
}
export function releaseLock(cwd, filePath, owner) {
    const registry = loadRegistry(cwd);
    const normalized = normalizePath(cwd, filePath);
    const idx = registry.locks.findIndex((l) => l.filePath === normalized && l.owner === owner);
    if (idx === -1)
        return false;
    registry.locks.splice(idx, 1);
    saveRegistry(cwd, registry);
    return true;
}
export function releaseAllByOwner(cwd, owner) {
    const registry = loadRegistry(cwd);
    const before = registry.locks.length;
    registry.locks = registry.locks.filter((l) => l.owner !== owner);
    const released = before - registry.locks.length;
    if (released > 0)
        saveRegistry(cwd, registry);
    return released;
}
export function isLocked(cwd, filePath) {
    const registry = loadRegistry(cwd);
    const normalized = normalizePath(cwd, filePath);
    return registry.locks.find((l) => l.filePath === normalized) || null;
}
export function getLockedFiles(cwd) {
    const registry = loadRegistry(cwd);
    return registry.locks;
}
export function formatOwnershipStatus(cwd) {
    const locks = getLockedFiles(cwd);
    if (locks.length === 0)
        return "No file locks active.";
    const lines = ["[File Ownership]", `${locks.length} file(s) locked:`];
    for (const lock of locks) {
        const remaining = Math.round((lock.expiresAt - Date.now()) / 1000);
        lines.push(`  ${lock.filePath} — owner: ${lock.owner} (${remaining}s remaining)`);
    }
    return lines.join("\n");
}
function normalizePath(cwd, filePath) {
    if (filePath.startsWith(cwd)) {
        return filePath.slice(cwd.length + 1);
    }
    return filePath;
}
