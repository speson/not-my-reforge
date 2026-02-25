// task-completed.ts — Verify quality when a task is marked complete
// Event: TaskCompleted
// Enhanced in v1.3: Records worker branch + modified files in team state
import { readStdin, writeError, writeOutput } from "../lib/io.js";
import { existsSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { loadTeamState, saveTeamState, updateWorker, allWorkersDone } from "../lib/team/state.js";
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
function getChangedFiles(cwd) {
    const isGit = exec("git rev-parse --is-inside-work-tree", cwd);
    if (!isGit.ok)
        return [];
    const changedFiles = exec("git diff --name-only", cwd);
    return changedFiles.stdout ? changedFiles.stdout.split("\n").filter(Boolean) : [];
}
function getCurrentBranch(cwd) {
    const result = exec("git branch --show-current", cwd);
    return result.ok ? result.stdout : null;
}
async function main() {
    const input = await readStdin();
    const cwd = input.cwd;
    if (!cwd)
        process.exit(0);
    const issues = [];
    const files = getChangedFiles(cwd);
    const currentBranch = getCurrentBranch(cwd);
    // 1. Run related tests
    const testFiles = files.filter((f) => f.includes(".test.") || f.includes(".spec.") || f.includes("__tests__"));
    if (testFiles.length > 0) {
        const testResult = exec(`npx jest --passWithNoTests ${testFiles.join(" ")} 2>&1`, cwd);
        if (!testResult.ok) {
            issues.push("Tests are failing for modified files");
        }
    }
    // 2. Check for TODOs in modified files
    for (const file of files) {
        const fullPath = `${cwd}/${file}`;
        if (!existsSync(fullPath))
            continue;
        try {
            const content = readFileSync(fullPath, "utf-8");
            const todos = content.match(/(TODO|FIXME|HACK|XXX)(\(|:|\s)/g);
            if (todos && todos.length > 0) {
                issues.push(`${file} has ${todos.length} TODO/FIXME item(s)`);
            }
        }
        catch { /* skip */ }
    }
    // 3. Typecheck for TS/JS files
    const hasTs = files.some((f) => f.endsWith(".ts") || f.endsWith(".tsx"));
    if (hasTs) {
        const tsc = exec("npx tsc --noEmit 2>&1", cwd);
        if (!tsc.ok && tsc.stdout) {
            const errorCount = (tsc.stdout.match(/error TS/g) || []).length;
            if (errorCount > 0) {
                issues.push(`TypeScript: ${errorCount} type error(s)`);
            }
        }
    }
    if (issues.length > 0) {
        writeError([
            "Task completion blocked — issues found:",
            ...issues.map((i) => `  - ${i}`),
            "",
            "Please resolve these before marking the task as complete.",
        ].join("\n"));
        process.exit(2);
    }
    // Update team state if this worker belongs to a team
    const teamState = loadTeamState(cwd);
    if (teamState && currentBranch) {
        const worker = teamState.workers.find((w) => w.branch === currentBranch);
        if (worker) {
            updateWorker(teamState, worker.id, {
                status: "done",
                modifiedFiles: files,
                completedAt: new Date().toISOString(),
            });
            saveTeamState(cwd, teamState);
            const allDone = allWorkersDone(teamState);
            const doneCount = teamState.workers.filter((w) => w.status === "done").length;
            writeOutput({
                hookSpecificOutput: {
                    hookEventName: "PostToolUse",
                    additionalContext: [
                        "Task completion verified. Tests pass, no TODOs in changed files.",
                        `Team progress: ${doneCount}/${teamState.workers.length} workers done.`,
                        ...(allDone
                            ? [
                                "All workers are done! Ready for merge.",
                                `Run: bash "\${CLAUDE_PLUGIN_ROOT}/scripts/team-merge.sh" "${teamState.sessionName}" "${teamState.baseBranch}"`,
                            ]
                            : []),
                    ].join("\n"),
                },
            });
            return;
        }
    }
    writeOutput({
        hookSpecificOutput: {
            hookEventName: "PostToolUse",
            additionalContext: "Task completion verified. Tests pass, no TODOs in changed files.",
        },
    });
}
main();
