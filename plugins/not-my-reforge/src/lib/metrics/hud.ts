// HUD — tmux statusline renderer for real-time session metrics

import type { SessionMetrics, HudState } from "./types.js";
import { CONTEXT_THRESHOLDS } from "./types.js";
import { getSessionDuration } from "./tracker.js";

export function buildHudState(
  metrics: SessionMetrics,
  activeMode?: string
): HudState {
  const lastToolEntry = Object.values(metrics.toolCalls).sort(
    (a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime()
  )[0];

  const usage = metrics.estimatedTokens / CONTEXT_THRESHOLDS.maxTokens;
  let contextUsage: string;
  if (usage < CONTEXT_THRESHOLDS.warn) {
    contextUsage = `${Math.round(usage * 100)}%`;
  } else if (usage < CONTEXT_THRESHOLDS.critical) {
    contextUsage = `${Math.round(usage * 100)}%!`;
  } else {
    contextUsage = `${Math.round(usage * 100)}%!!`;
  }

  return {
    sessionDuration: getSessionDuration(metrics),
    toolCallCount: metrics.totalToolCalls,
    failureCount: metrics.totalFailures,
    agentCount: metrics.agentsSpawned,
    activeMode: activeMode || "normal",
    lastTool: lastToolEntry?.tool || "-",
    contextUsage,
  };
}

/**
 * Format HUD for tmux status-right.
 * Short format: "reforge: 5m | 42 calls | ctx:35% | normal"
 */
export function formatHudForTmux(state: HudState): string {
  const parts = [
    `reforge: ${state.sessionDuration}`,
    `${state.toolCallCount} calls`,
  ];

  if (state.failureCount > 0) {
    parts.push(`${state.failureCount} err`);
  }

  if (state.agentCount > 0) {
    parts.push(`${state.agentCount} agents`);
  }

  parts.push(`ctx:${state.contextUsage}`);

  if (state.activeMode !== "normal") {
    parts.push(state.activeMode);
  }

  return parts.join(" | ");
}

/**
 * Format HUD for inline display (richer format).
 */
export function formatHudInline(state: HudState): string {
  return [
    `Session: ${state.sessionDuration}`,
    `Tools: ${state.toolCallCount} calls, ${state.failureCount} failures`,
    `Agents: ${state.agentCount}`,
    `Context: ${state.contextUsage}`,
    `Mode: ${state.activeMode}`,
    `Last tool: ${state.lastTool}`,
  ].join("\n");
}
