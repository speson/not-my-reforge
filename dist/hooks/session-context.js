// session-context.ts — Load project context at session start
// Event: SessionStart (startup|resume)
import { readStdin, writeOutput } from "../lib/io.js";
import { writeDataFile } from "../lib/storage.js";
import { loadRegistry, saveRegistry } from "../lib/mode-registry/registry.js";
import { EMPTY_METRICS } from "../lib/metrics/types.js";
import { existsSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";
function exec(cmd, cwd) {
    try {
        return execSync(cmd, { cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
    }
    catch {
        return "";
    }
}
function resetSidebarState(cwd) {
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
    // 4. Reset session metrics with new sessionId
    const newSessionId = `session-${Date.now()}`;
    writeDataFile(cwd, "session-metrics.json", {
        ...EMPTY_METRICS,
        sessionId: newSessionId,
        startedAt: now,
        lastActivityAt: now,
    });
}
async function main() {
    const input = await readStdin();
    const cwd = input.cwd;
    const source = input.source || "startup";
    if (!cwd || !existsSync(cwd))
        process.exit(0);
    // Reset sidebar state on session start to prevent stale data from previous sessions
    resetSidebarState(cwd);
    const sections = [];
    // 1. Git status summary
    const isGit = exec("git rev-parse --is-inside-work-tree", cwd);
    if (isGit === "true") {
        const branch = exec("git branch --show-current", cwd) || "detached";
        const lastCommit = exec("git log -1 --oneline", cwd) || "no commits";
        const modified = exec("git diff --stat --shortstat", cwd);
        const staged = exec("git diff --cached --shortstat", cwd);
        const untrackedCount = exec("git ls-files --others --exclude-standard", cwd)
            .split("\n")
            .filter(Boolean).length;
        let gitLine = `Git: branch '${branch}', last commit: ${lastCommit}`;
        if (modified)
            gitLine += `\n   Modified: ${modified}`;
        if (staged)
            gitLine += `\n   Staged: ${staged}`;
        if (untrackedCount > 0)
            gitLine += `\n   Untracked files: ${untrackedCount}`;
        sections.push(gitLine);
    }
    // 2. Detect project type
    const projectChecks = [
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
    const types = new Set();
    for (const [file, type] of projectChecks) {
        if (existsSync(join(cwd, file)))
            types.add(type);
    }
    if (types.size > 0) {
        sections.push(`Project type: ${[...types].join(", ")}`);
    }
    // 3. Handoff file
    const handoffPath = join(cwd, ".claude", "handoff.md");
    if (existsSync(handoffPath)) {
        if (source === "resume") {
            try {
                const content = readFileSync(handoffPath, "utf-8");
                const preview = content.split("\n").slice(0, 20).join("\n");
                sections.push(`Handoff note found (.claude/handoff.md):\n${preview}`);
            }
            catch {
                sections.push("Handoff note available at .claude/handoff.md");
            }
        }
        else {
            sections.push("Handoff note available at .claude/handoff.md");
        }
    }
    // 4. Active TODOs in changed files
    if (isGit === "true") {
        const changedFiles = exec("git diff --name-only HEAD", cwd)
            .split("\n")
            .filter(Boolean)
            .slice(0, 10);
        let todoFileCount = 0;
        for (const file of changedFiles) {
            const fullPath = join(cwd, file);
            if (!existsSync(fullPath))
                continue;
            try {
                const content = readFileSync(fullPath, "utf-8");
                if (/TODO|FIXME/.test(content))
                    todoFileCount++;
            }
            catch {
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
