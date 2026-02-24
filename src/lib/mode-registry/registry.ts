// Mode registry — central mode activation/deactivation with conflict detection

import { readDataFile, writeDataFile } from "../storage.js";
import type { ModeRegistry, ModeName, ActiveMode, CancelSentinel } from "./types.js";
import { MODE_CONFLICTS, CANCEL_TTL_MS, EMPTY_REGISTRY } from "./types.js";

const REGISTRY_FILE = "mode-registry.json";
const MAX_HISTORY = 50;

export function loadRegistry(cwd: string): ModeRegistry {
  return readDataFile<ModeRegistry>(cwd, REGISTRY_FILE, { ...EMPTY_REGISTRY, history: [] });
}

export function saveRegistry(cwd: string, registry: ModeRegistry): void {
  writeDataFile(cwd, REGISTRY_FILE, registry);
}

export function isCancelCoolingDown(registry: ModeRegistry, mode: ModeName): boolean {
  const sentinel = registry.cancelSentinel;
  if (!sentinel) return false;
  if (sentinel.cancelledMode !== mode) return false;

  const elapsed = Date.now() - sentinel.cancelledAt;
  return elapsed < sentinel.ttlMs;
}

export function getConflicts(registry: ModeRegistry, mode: ModeName): ModeName[] {
  if (!registry.activeMode) return [];

  const conflicts = MODE_CONFLICTS[mode] || [];
  if (conflicts.includes(registry.activeMode.name)) {
    return [registry.activeMode.name];
  }
  return [];
}

export function activateMode(
  cwd: string,
  mode: ModeName,
  goal?: string
): { success: boolean; error?: string } {
  const registry = loadRegistry(cwd);

  // Check cancel cooldown
  if (isCancelCoolingDown(registry, mode)) {
    const remaining = Math.ceil(
      (CANCEL_TTL_MS - (Date.now() - (registry.cancelSentinel?.cancelledAt || 0))) / 1000
    );
    return {
      success: false,
      error: `${mode} was recently cancelled. Wait ${remaining}s before reactivating (prevents race conditions).`,
    };
  }

  // Check conflicts
  const conflicts = getConflicts(registry, mode);
  if (conflicts.length > 0) {
    return {
      success: false,
      error: `Cannot activate ${mode}: conflicts with active mode "${conflicts[0]}". Cancel it first with "reforge cancel ${conflicts[0]}".`,
    };
  }

  // If same mode is already active, allow (idempotent)
  if (registry.activeMode?.name === mode) {
    return { success: true };
  }

  registry.activeMode = {
    name: mode,
    activatedAt: Date.now(),
    goal,
  };

  saveRegistry(cwd, registry);
  return { success: true };
}

export function deactivateMode(
  cwd: string,
  mode: ModeName,
  outcome: "completed" | "cancelled" | "aborted" | "error",
  setCooldown: boolean = false
): void {
  const registry = loadRegistry(cwd);

  if (registry.activeMode?.name === mode) {
    // Record in history
    registry.history.push({
      name: mode,
      activatedAt: registry.activeMode.activatedAt,
      deactivatedAt: Date.now(),
      outcome,
    });

    // Trim history
    if (registry.history.length > MAX_HISTORY) {
      registry.history = registry.history.slice(-MAX_HISTORY);
    }

    registry.activeMode = null;

    // Set cancel cooldown sentinel
    if (setCooldown) {
      registry.cancelSentinel = {
        cancelledMode: mode,
        cancelledAt: Date.now(),
        ttlMs: CANCEL_TTL_MS,
      };
    }
  }

  saveRegistry(cwd, registry);
}

export function getActiveMode(cwd: string): ActiveMode | null {
  const registry = loadRegistry(cwd);
  return registry.activeMode;
}

export function formatModeStatus(cwd: string): string {
  const registry = loadRegistry(cwd);
  const lines: string[] = [];

  if (registry.activeMode) {
    const elapsed = Math.round((Date.now() - registry.activeMode.activatedAt) / 1000);
    lines.push(`Active mode: ${registry.activeMode.name} (${elapsed}s)`);
    if (registry.activeMode.goal) {
      lines.push(`Goal: ${registry.activeMode.goal}`);
    }
  } else {
    lines.push("No active mode (normal mode)");
  }

  if (registry.cancelSentinel) {
    const elapsed = Date.now() - registry.cancelSentinel.cancelledAt;
    if (elapsed < registry.cancelSentinel.ttlMs) {
      const remaining = Math.ceil((registry.cancelSentinel.ttlMs - elapsed) / 1000);
      lines.push(`Cancel cooldown: ${registry.cancelSentinel.cancelledMode} (${remaining}s remaining)`);
    }
  }

  const recent = registry.history.slice(-5).reverse();
  if (recent.length > 0) {
    lines.push("");
    lines.push("Recent modes:");
    for (const entry of recent) {
      const duration = Math.round((entry.deactivatedAt - entry.activatedAt) / 1000);
      lines.push(`  ${entry.name}: ${entry.outcome} (${duration}s)`);
    }
  }

  return lines.join("\n");
}
