// Session metrics tracker — aggregates tool call statistics
import { readDataFile, writeDataFile } from "../storage.js";
import { EMPTY_METRICS } from "./types.js";
const FILENAME = "session-metrics.json";
export function loadMetrics(cwd) {
    return readDataFile(cwd, FILENAME, {
        ...EMPTY_METRICS,
        sessionId: `session-${Date.now()}`,
        startedAt: new Date().toISOString(),
    });
}
export function saveMetrics(cwd, metrics) {
    metrics.lastActivityAt = new Date().toISOString();
    writeDataFile(cwd, FILENAME, metrics);
}
export function recordToolCall(metrics, tool, success, filePath) {
    if (!metrics.toolCalls[tool]) {
        metrics.toolCalls[tool] = {
            tool,
            count: 0,
            failures: 0,
            lastUsedAt: new Date().toISOString(),
        };
    }
    const stat = metrics.toolCalls[tool];
    stat.count++;
    stat.lastUsedAt = new Date().toISOString();
    if (!success)
        stat.failures++;
    metrics.totalToolCalls++;
    if (!success)
        metrics.totalFailures++;
    // Track modified files
    if (filePath && (tool === "Write" || tool === "Edit")) {
        if (!metrics.filesModified.includes(filePath)) {
            metrics.filesModified.push(filePath);
        }
    }
    // Rough token estimation: ~500 tokens per tool call (input+output average)
    metrics.estimatedTokens += 500;
}
export function recordAgentSpawn(metrics) {
    metrics.agentsSpawned++;
    metrics.estimatedTokens += 2000; // Agent spawns use more tokens
}
export function getSessionDuration(metrics) {
    const start = new Date(metrics.startedAt).getTime();
    const now = Date.now();
    const diff = Math.floor((now - start) / 1000);
    if (diff < 60)
        return `${diff}s`;
    if (diff < 3600)
        return `${Math.floor(diff / 60)}m ${diff % 60}s`;
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    return `${h}h ${m}m`;
}
export function getTopTools(metrics, n = 5) {
    return Object.values(metrics.toolCalls)
        .sort((a, b) => b.count - a.count)
        .slice(0, n);
}
export function formatMetricsSummary(metrics) {
    const duration = getSessionDuration(metrics);
    const topTools = getTopTools(metrics, 5);
    const successRate = metrics.totalToolCalls > 0
        ? Math.round(((metrics.totalToolCalls - metrics.totalFailures) / metrics.totalToolCalls) * 100)
        : 100;
    const lines = [
        `[Session Metrics]`,
        `Duration: ${duration}`,
        `Tool calls: ${metrics.totalToolCalls} (${successRate}% success)`,
        `Agents spawned: ${metrics.agentsSpawned}`,
        `Files modified: ${metrics.filesModified.length}`,
        `Est. tokens: ~${Math.round(metrics.estimatedTokens / 1000)}k`,
        "",
    ];
    if (topTools.length > 0) {
        lines.push("Top tools:");
        for (const t of topTools) {
            const failStr = t.failures > 0 ? ` (${t.failures} failed)` : "";
            lines.push(`  ${t.tool}: ${t.count}${failStr}`);
        }
    }
    return lines.join("\n");
}
