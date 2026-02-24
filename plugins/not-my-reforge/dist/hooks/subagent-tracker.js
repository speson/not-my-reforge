// subagent-tracker.ts — Track subagent spawns with analytics
// Event: PostToolUse (for Task tool calls)
import { readStdin } from "../lib/io.js";
import { readDataFile, writeDataFile } from "../lib/storage.js";
const FILENAME = "agent-metrics.json";
const MAX_ENTRIES = 100;
function loadMetrics(cwd) {
    return readDataFile(cwd, FILENAME, {
        agents: [],
        byType: {},
        sessionTotals: {
            totalSpawned: 0,
            totalDurationMs: 0,
            successCount: 0,
            failureCount: 0,
        },
        lastUpdated: new Date().toISOString(),
    });
}
function rebuildStats(metrics) {
    const byType = {};
    let totalDuration = 0;
    let successCount = 0;
    let failureCount = 0;
    for (const agent of metrics.agents) {
        const type = agent.agentType;
        if (!byType[type]) {
            byType[type] = {
                totalCalls: 0,
                totalDurationMs: 0,
                avgDurationMs: 0,
                successRate: 0,
                failures: 0,
            };
        }
        byType[type].totalCalls += 1;
        if (agent.durationMs) {
            byType[type].totalDurationMs += agent.durationMs;
            totalDuration += agent.durationMs;
        }
        if (agent.success) {
            successCount += 1;
        }
        else {
            byType[type].failures += 1;
            failureCount += 1;
        }
    }
    // Calculate averages and rates
    for (const stats of Object.values(byType)) {
        const completedWithDuration = stats.totalCalls - stats.failures;
        stats.avgDurationMs = completedWithDuration > 0
            ? Math.round(stats.totalDurationMs / completedWithDuration)
            : 0;
        stats.successRate = stats.totalCalls > 0
            ? Math.round(((stats.totalCalls - stats.failures) / stats.totalCalls) * 100)
            : 0;
    }
    metrics.byType = byType;
    metrics.sessionTotals = {
        totalSpawned: metrics.agents.length,
        totalDurationMs: totalDuration,
        successCount,
        failureCount,
    };
}
async function main() {
    const input = await readStdin();
    const cwd = input.cwd;
    if (!cwd || input.tool_name !== "Task")
        process.exit(0);
    const metrics = loadMetrics(cwd);
    const subagentType = input.tool_input?.subagent_type || "unknown";
    const description = input.tool_input?.description || "";
    const model = input.tool_input?.model;
    const background = input.tool_input?.run_in_background || false;
    // Determine success from response
    const response = input.tool_response?.content || "";
    const isError = input.tool_response?.is_error || false;
    const success = !isError;
    // Extract duration from response if available
    let durationMs;
    const durationMatch = response.match(/duration_ms:\s*(\d+)/);
    if (durationMatch) {
        durationMs = parseInt(durationMatch[1], 10);
    }
    const metric = {
        agentType: subagentType,
        model,
        startTime: Date.now(),
        durationMs,
        description,
        success,
        background,
    };
    metrics.agents.push(metric);
    // Trim to max entries
    if (metrics.agents.length > MAX_ENTRIES) {
        metrics.agents = metrics.agents.slice(-MAX_ENTRIES);
    }
    // Rebuild aggregate stats
    rebuildStats(metrics);
    metrics.lastUpdated = new Date().toISOString();
    writeDataFile(cwd, FILENAME, metrics);
}
main();
