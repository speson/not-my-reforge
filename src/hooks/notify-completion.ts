// notify-completion.ts — Send notifications on session/team/ralph completion
// Event: Stop

import { readStdin, writeOutput } from "../lib/io.js";
import { loadNotifyConfig } from "../lib/notify/storage.js";
import { broadcastNotification } from "../lib/notify/sender.js";
import { loadMetrics, getSessionDuration } from "../lib/metrics/tracker.js";
import { loadTeamState, allWorkersDone } from "../lib/team/state.js";
import type { HookInput } from "../lib/types.js";
import type { NotifyEvent, NotifyMessage } from "../lib/notify/types.js";
import { execSync } from "node:child_process";

function getGitInfo(cwd: string): { project: string; branch: string } {
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
  } catch {
    return { project: "unknown", branch: "unknown" };
  }
}

async function main() {
  const input = await readStdin<HookInput>();
  const cwd = input.cwd;

  if (!cwd) process.exit(0);

  const config = loadNotifyConfig(cwd);
  if (!config.enabled || config.channels.length === 0) process.exit(0);

  const metrics = loadMetrics(cwd);
  const duration = getSessionDuration(metrics);
  const { project, branch } = getGitInfo(cwd);

  // Check minimum duration
  const startTime = new Date(metrics.startedAt).getTime();
  const elapsed = (Date.now() - startTime) / 1000;
  if (elapsed < config.minDurationSec) process.exit(0);

  const messages: NotifyMessage[] = [];

  // Check team completion
  const teamState = loadTeamState(cwd);
  if (teamState && config.events.includes("team_complete")) {
    if (allWorkersDone(teamState)) {
      const done = teamState.workers.filter((w) => w.status === "done").length;
      const failed = teamState.workers.filter((w) => w.status === "failed").length;
      messages.push({
        event: "team_complete",
        title: `Team "${teamState.sessionName}" completed`,
        body: `${done} workers done, ${failed} failed. Duration: ${duration}. ${metrics.totalToolCalls} tool calls.`,
        project,
        branch,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Check Ralph completion
  try {
    const { readDataFile } = await import("../lib/storage.js");
    const ralphState = readDataFile<{ active: boolean; status: string; task: string; iteration: number } | null>(
      cwd,
      "ralph-state.json",
      null
    );
    if (ralphState) {
      if (ralphState.status === "success" && config.events.includes("ralph_complete")) {
        messages.push({
          event: "ralph_complete",
          title: "Ralph Loop completed successfully",
          body: `Task: ${ralphState.task}\nIterations: ${ralphState.iteration}. Duration: ${duration}.`,
          project,
          branch,
          timestamp: new Date().toISOString(),
        });
      } else if (ralphState.status === "failed" && config.events.includes("ralph_failed")) {
        messages.push({
          event: "ralph_failed",
          title: "Ralph Loop failed",
          body: `Task: ${ralphState.task}\nIterations: ${ralphState.iteration}. Duration: ${duration}.`,
          project,
          branch,
          timestamp: new Date().toISOString(),
        });
      }
    }
  } catch { /* no ralph state */ }

  // Default session completion
  if (messages.length === 0 && config.events.includes("session_complete")) {
    messages.push({
      event: "session_complete",
      title: "Session completed",
      body: `Duration: ${duration}. ${metrics.totalToolCalls} tool calls, ${metrics.filesModified.length} files modified.`,
      project,
      branch,
      timestamp: new Date().toISOString(),
    });
  }

  // Send all notifications
  const enabledChannels = config.channels.filter((c) => c.enabled);
  for (const msg of messages) {
    await broadcastNotification(enabledChannels, msg);
  }

  if (messages.length > 0) {
    writeOutput({
      hookSpecificOutput: {
        hookEventName: "PostToolUse" as const,
        additionalContext: `Notifications sent: ${messages.map((m) => m.event).join(", ")}`,
      },
    });
  }
}

main();
