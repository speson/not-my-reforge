// session-history-save.ts — Record session to history on stop
// Event: Stop (async)
import { readStdin } from "../lib/io.js";
import { appendRecord } from "../lib/history/storage.js";
import { loadMetrics } from "../lib/metrics/tracker.js";
import { readDataFile } from "../lib/storage.js";
import { execSync } from "node:child_process";
function getGitInfo(cwd) {
    try {
        const toplevel = execSync("git rev-parse --show-toplevel", {
            cwd,
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"],
        }).trim();
        const project = toplevel.split("/").pop() || "unknown";
        const branch = execSync("git branch --show-current", {
            cwd,
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"],
        }).trim();
        return { project, branch };
    }
    catch {
        return { project: "unknown", branch: "unknown" };
    }
}
function detectMode(cwd) {
    const ralph = readDataFile(cwd, "ralph-state.json", null);
    if (ralph?.active)
        return "ralph";
    const autopilot = readDataFile(cwd, "autopilot-state.json", null);
    if (autopilot?.active)
        return "autopilot";
    const pipeline = readDataFile(cwd, "pipeline-state.json", null);
    if (pipeline?.active)
        return "pipeline";
    const team = readDataFile(cwd, "team-state.json", null);
    if (team?.active)
        return "team";
    return "normal";
}
function detectOutcome(cwd) {
    // Check various state files for outcome hints
    const ralph = readDataFile(cwd, "ralph-state.json", null);
    if (ralph?.status === "aborted")
        return "aborted";
    const autopilot = readDataFile(cwd, "autopilot-state.json", null);
    if (autopilot?.phase === "aborted")
        return "aborted";
    const pipeline = readDataFile(cwd, "pipeline-state.json", null);
    if (pipeline && !pipeline.active && pipeline.currentStage === "done")
        return "completed";
    return "completed";
}
async function main() {
    const input = await readStdin();
    const cwd = input.cwd;
    if (!cwd)
        process.exit(0);
    const metrics = loadMetrics(cwd);
    const { project, branch } = getGitInfo(cwd);
    const startTime = new Date(metrics.startedAt).getTime();
    const durationSec = Math.round((Date.now() - startTime) / 1000);
    // Don't record very short sessions (< 10 seconds)
    if (durationSec < 10)
        process.exit(0);
    const record = {
        sessionId: metrics.sessionId || `session-${Date.now()}`,
        startedAt: metrics.startedAt,
        endedAt: new Date().toISOString(),
        durationSec,
        project,
        branch,
        mode: detectMode(cwd),
        toolCalls: metrics.totalToolCalls,
        failures: metrics.totalFailures,
        filesModified: metrics.filesModified.length,
        agentsSpawned: metrics.agentsSpawned,
        estimatedTokens: metrics.estimatedTokens,
        outcome: detectOutcome(cwd),
    };
    appendRecord(cwd, record);
}
main();
