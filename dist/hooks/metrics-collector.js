// metrics-collector.ts — Collect session metrics on tool failures
// Event: PostToolUse (Bash|Edit) — complements context-monitor for failure tracking
import { readStdin } from "../lib/io.js";
import { loadMetrics, saveMetrics, recordAgentSpawn } from "../lib/metrics/tracker.js";
async function main() {
    const input = await readStdin();
    const cwd = input.cwd;
    if (!cwd)
        process.exit(0);
    const toolName = input.tool_name || "unknown";
    const metrics = loadMetrics(cwd);
    // Track agent spawns separately
    if (toolName === "Task") {
        recordAgentSpawn(metrics);
        saveMetrics(cwd, metrics);
        process.exit(0);
    }
    // Track failures (successes are tracked by context-monitor)
    if (input.tool_output?.is_error) {
        const stat = metrics.toolCalls[toolName];
        if (stat) {
            stat.failures++;
            metrics.totalFailures++;
        }
        saveMetrics(cwd, metrics);
    }
}
main();
