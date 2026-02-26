// session-context.ts — Load project context at session start
// Event: SessionStart (startup|resume)

import { readStdin, writeOutput } from "../lib/io.js";
import { writeDataFile } from "../lib/storage.js";
import { loadRegistry, saveRegistry } from "../lib/mode-registry/registry.js";
import { EMPTY_METRICS } from "../lib/metrics/types.js";
import { loadMetrics } from "../lib/metrics/tracker.js";
import { existsSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";
import type { SessionStartInput } from "../lib/types.js";

function exec(cmd: string, cwd: string): string {
  try {
    return execSync(cmd, { cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch {
    return "";
  }
}

function resetSidebarState(cwd: string, source: string): void {
  const now = new Date().toISOString();

  // 1. Reset task tracker state
  writeDataFile(cwd, "todo-state.json", { tasks: [], updatedAt: now });

  // 2. Reset shortcut state
  writeDataFile(cwd, "shortcut-state.json", { lastShortcut: null });

  // 3. Reset mode registry (preserve history)
  const registry = loadRegistry(cwd);
  registry.activeMode = null;
  registry.cancelSentinel = null;
  saveRegistry(cwd, registry);

  // 4. Reset session metrics only on startup (preserve across resume for file tracking)
  if (source === "startup") {
    const newSessionId = `session-${Date.now()}`;
    writeDataFile(cwd, "session-metrics.json", {
      ...EMPTY_METRICS,
      sessionId: newSessionId,
      startedAt: now,
      lastActivityAt: now,
    });
  }
}

async function main() {
  const input = await readStdin<SessionStartInput>();
  const cwd = input.cwd;
  const source = input.source || "startup";

  if (!cwd || !existsSync(cwd)) process.exit(0);

  // Reset sidebar state on session start to prevent stale data from previous sessions
  try {
    resetSidebarState(cwd, source);
  } catch {
    // silent — don't block session start for sidebar reset failures
  }

  const sections: string[] = [];

  // 1. Git info (branch + last commit)
  const isGit = exec("git rev-parse --is-inside-work-tree", cwd);
  if (isGit === "true") {
    const branch = exec("git branch --show-current", cwd) || "detached";
    const lastCommit = exec("git log -1 --oneline", cwd) || "no commits";
    sections.push(`Git: branch '${branch}', last commit: ${lastCommit}`);
  }

  // 2. Session file activity (files modified during this session)
  const metrics = loadMetrics(cwd);
  if (metrics.filesModified.length > 0) {
    const relFiles = metrics.filesModified
      .map((f) => (f.startsWith(cwd) ? f.slice(cwd.length + 1) : f));
    const fileList = relFiles.map((f) => `   ${f}`).join("\n");
    sections.push(`Session changes (${relFiles.length} files):\n${fileList}`);
  }

  // 3. Detect project type
  const projectChecks: [string, string][] = [
    ["package.json", "Node.js"],
    ["tsconfig.json", "TypeScript"],
    ["Cargo.toml", "Rust"],
    ["go.mod", "Go"],
    ["pyproject.toml", "Python"],
    ["setup.py", "Python"],
    ["requirements.txt", "Python"],
    ["Gemfile", "Ruby"],
    ["pom.xml", "Java/Kotlin"],
    ["build.gradle", "Java/Kotlin"],
    ["build.gradle.kts", "Java/Kotlin"],
    ["pubspec.yaml", "Flutter/Dart"],
  ];

  const types = new Set<string>();
  for (const [file, type] of projectChecks) {
    if (existsSync(join(cwd, file))) types.add(type);
  }
  if (types.size > 0) {
    sections.push(`Project type: ${[...types].join(", ")}`);
  }

  // 4. Handoff file
  const handoffPath = join(cwd, ".claude", "handoff.md");
  if (existsSync(handoffPath)) {
    if (source === "resume") {
      try {
        const content = readFileSync(handoffPath, "utf-8");
        const preview = content.split("\n").slice(0, 20).join("\n");
        sections.push(`Handoff note found (.claude/handoff.md):\n${preview}`);
      } catch {
        sections.push("Handoff note available at .claude/handoff.md");
      }
    } else {
      sections.push("Handoff note available at .claude/handoff.md");
    }
  }

  // 5. Active TODOs in changed files
  if (isGit === "true") {
    const changedFiles = exec("git diff --name-only HEAD", cwd)
      .split("\n")
      .filter(Boolean)
      .slice(0, 10);

    let todoFileCount = 0;
    for (const file of changedFiles) {
      const fullPath = join(cwd, file);
      if (!existsSync(fullPath)) continue;
      try {
        const content = readFileSync(fullPath, "utf-8");
        if (/TODO|FIXME/.test(content)) todoFileCount++;
      } catch {
        // skip
      }
    }

    if (todoFileCount > 0) {
      sections.push(`${todoFileCount} changed file(s) contain TODOs — address before finishing`);
    }
  }

  if (sections.length > 0) {
    writeOutput({
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext: sections.join("\n"),
      },
    });
  }
}

main();
