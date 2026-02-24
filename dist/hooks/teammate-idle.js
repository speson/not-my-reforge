// teammate-idle.ts — Run checks when a teammate becomes idle
// Event: TeammateIdle
// Enhanced in v1.3: Team state awareness — checks pending tasks, records idle state
import { readStdin, writeError, writeOutput } from "../lib/io.js";
import { execSync } from "node:child_process";
import { loadTeamState, getActiveWorkers } from "../lib/team/state.js";
function exec(cmd, cwd) {
    try {
        const stdout = execSync(cmd, { cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
        return { stdout, ok: true };
    }
    catch (e) {
        const error = e;
        return { stdout: error.stdout || "", ok: false };
    }
}
async function main() {
    const input = await readStdin();
    const cwd = input.cwd;
    if (!cwd)
        process.exit(0);
    const issues = [];
    const suggestions = [];
    // Check team state for pending tasks
    const teamState = loadTeamState(cwd);
    if (teamState) {
        const activeWorkers = getActiveWorkers(teamState);
        const pendingWorkers = teamState.workers.filter((w) => w.status === "pending");
        if (pendingWorkers.length > 0) {
            suggestions.push(`${pendingWorkers.length} pending task(s) available: ${pendingWorkers.map((w) => w.name).join(", ")}`);
        }
        if (activeWorkers.length > 0) {
            suggestions.push(`${activeWorkers.length} teammate(s) still working: ${activeWorkers.map((w) => w.name).join(", ")}`);
        }
    }
    // Get files modified by this teammate
    const isGit = exec("git rev-parse --is-inside-work-tree", cwd);
    if (!isGit.ok)
        process.exit(0);
    const changedFiles = exec("git diff --name-only", cwd);
    if (!changedFiles.stdout && suggestions.length === 0)
        process.exit(0);
    const files = changedFiles.stdout ? changedFiles.stdout.split("\n").filter(Boolean) : [];
    const hasTs = files.some((f) => f.endsWith(".ts") || f.endsWith(".tsx"));
    const hasJs = files.some((f) => f.endsWith(".js") || f.endsWith(".jsx"));
    // Run typecheck on TS files
    if (hasTs || hasJs) {
        const tsc = exec("npx tsc --noEmit 2>&1", cwd);
        if (!tsc.ok && tsc.stdout) {
            const errorCount = (tsc.stdout.match(/error TS/g) || []).length;
            if (errorCount > 0) {
                issues.push(`TypeScript: ${errorCount} type error(s) found`);
            }
        }
    }
    // Run lint if available
    if (files.length > 0) {
        const lint = exec("npm run lint --if-present 2>&1", cwd);
        if (!lint.ok && lint.stdout && lint.stdout.includes("error")) {
            issues.push("Lint errors detected in modified files");
        }
    }
    // Check for TODOs in modified files
    for (const file of files) {
        try {
            const content = exec(`cat "${cwd}/${file}"`, cwd);
            if (content.ok) {
                const todos = content.stdout.match(/(TODO|FIXME|HACK|XXX)(\(|:|\s)/g);
                if (todos && todos.length > 0) {
                    issues.push(`${file}: ${todos.length} TODO/FIXME item(s) remaining`);
                }
            }
        }
        catch { /* skip unreadable files */ }
    }
    if (issues.length > 0) {
        writeError([
            "Issues found in your changes:",
            ...issues.map((i) => `  - ${i}`),
            "",
            ...(suggestions.length > 0
                ? ["Team context:", ...suggestions.map((s) => `  - ${s}`), ""]
                : []),
            "Please fix these issues before idling.",
        ].join("\n"));
        process.exit(2); // Keep teammate working
    }
    // If clean but there are pending tasks, provide context
    if (suggestions.length > 0) {
        writeOutput({
            hookSpecificOutput: {
                hookEventName: "PostToolUse",
                additionalContext: [
                    "Teammate changes look clean.",
                    "Team status:",
                    ...suggestions.map((s) => `  - ${s}`),
                ].join("\n"),
            },
        });
    }
    else {
        writeOutput({
            hookSpecificOutput: {
                hookEventName: "PostToolUse",
                additionalContext: "Teammate changes look clean. No lint/type errors detected.",
            },
        });
    }
}
main();
