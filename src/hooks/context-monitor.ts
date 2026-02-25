// context-monitor.ts — Track context window usage and warn on high usage
// Event: PostToolUse (all tools)

import { writeFileSync } from "node:fs";
import { readStdin, writeError, writeOutput } from "../lib/io.js";
import { loadMetrics, saveMetrics, recordToolCall } from "../lib/metrics/tracker.js";
import { CONTEXT_THRESHOLDS } from "../lib/metrics/types.js";
import type { HookInput } from "../lib/types.js";

interface PostToolInput extends HookInput {
  tool_name?: string;
  tool_input?: { file_path?: string; command?: string };
  tool_output?: { content?: string };
}

function estimateOutputTokens(output: string | undefined): number {
  if (!output) return 100;
  // Rough: ~4 chars per token
  return Math.min(Math.ceil(output.length / 4), 10000);
}

async function main() {
  // Dismiss shortcut popup when Claude starts responding
  try { writeFileSync("/tmp/reforge-popup-done", ""); } catch {}

  const input = await readStdin<PostToolInput>();
  const cwd = input.cwd;

  if (!cwd) process.exit(0);

  const toolName = input.tool_name || "unknown";
  const metrics = loadMetrics(cwd);

  // Record this tool call
  const filePath = input.tool_input?.file_path;
  recordToolCall(metrics, toolName, true, filePath);

  // Add output token estimate
  const outputStr =
    typeof input.tool_output === "object" && input.tool_output?.content
      ? input.tool_output.content
      : undefined;
  metrics.estimatedTokens += estimateOutputTokens(outputStr as string | undefined);

  saveMetrics(cwd, metrics);

  // Check context usage
  const usage = metrics.estimatedTokens / CONTEXT_THRESHOLDS.maxTokens;

  if (usage >= CONTEXT_THRESHOLDS.critical) {
    writeError(
      [
        `Context window critically high (~${Math.round(usage * 100)}% estimated).`,
        "Consider:",
        "  - Use /compact to reduce context",
        "  - Delegate subtasks to agents (they get fresh context)",
        "  - Save important notes to notepad before compaction",
      ].join("\n")
    );
    // Don't block, just warn
    process.exit(0);
  }

  if (usage >= CONTEXT_THRESHOLDS.warn) {
    writeOutput({
      hookSpecificOutput: {
        hookEventName: "PostToolUse" as const,
        additionalContext: `Context usage: ~${Math.round(usage * 100)}%. Consider using /compact soon.`,
      },
    });
    return;
  }
}

main();
