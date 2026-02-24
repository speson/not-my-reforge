// Circuit breaker — tracks consecutive failures and escalates

import { readDataFile, writeDataFile } from "../storage.js";

interface FailureEntry {
  count: number;
  lastError: string;
  timestamp: number;
}

interface CircuitBreakerState {
  failures: Record<string, FailureEntry>;
}

const FILENAME = "circuit-breaker.json";
const RESET_AFTER_MS = 30 * 60 * 1000; // 30 minutes

export function loadState(cwd: string): CircuitBreakerState {
  return readDataFile<CircuitBreakerState>(cwd, FILENAME, { failures: {} });
}

export function saveState(cwd: string, state: CircuitBreakerState): void {
  writeDataFile(cwd, FILENAME, state);
}

export function recordFailure(
  cwd: string,
  toolName: string,
  error: string
): { count: number; escalation: string | null } {
  const state = loadState(cwd);
  const now = Date.now();

  const existing = state.failures[toolName];

  // Reset if last failure was too long ago
  if (existing && now - existing.timestamp > RESET_AFTER_MS) {
    state.failures[toolName] = { count: 1, lastError: error, timestamp: now };
  } else if (existing) {
    existing.count += 1;
    existing.lastError = error;
    existing.timestamp = now;
  } else {
    state.failures[toolName] = { count: 1, lastError: error, timestamp: now };
  }

  const count = state.failures[toolName].count;
  saveState(cwd, state);

  let escalation: string | null = null;

  if (count >= 7) {
    escalation = `${count} consecutive failures with ${toolName}. This approach is not working. Please ask the user for guidance or try a completely different strategy.`;
  } else if (count >= 5) {
    escalation = `${count} consecutive failures with ${toolName}. Consider a fundamentally different approach. The current strategy has failed repeatedly.`;
  } else if (count >= 3) {
    escalation = `${count} consecutive failures with ${toolName}. Consider using a more capable model tier or breaking the problem into smaller steps.`;
  }

  return { count, escalation };
}

export function recordSuccess(cwd: string, toolName: string): void {
  const state = loadState(cwd);
  delete state.failures[toolName];
  saveState(cwd, state);
}
