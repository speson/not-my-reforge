// Team merge utilities — conflict detection and merge coordination
import { execSync } from "node:child_process";
function exec(cmd, cwd) {
    try {
        const stdout = execSync(cmd, {
            cwd,
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"],
        }).trim();
        return { stdout, ok: true };
    }
    catch (e) {
        const error = e;
        return { stdout: error.stdout || "", ok: false };
    }
}
export function detectFileOverlaps(cwd, state) {
    const fileWorkerMap = new Map();
    for (const worker of state.workers) {
        if (worker.status !== "done")
            continue;
        const diff = exec(`git diff --name-only "${state.baseBranch}...${worker.branch}"`, cwd);
        if (!diff.ok)
            continue;
        const files = diff.stdout.split("\n").filter(Boolean);
        for (const file of files) {
            const existing = fileWorkerMap.get(file) || [];
            existing.push(worker.id);
            fileWorkerMap.set(file, existing);
        }
    }
    return Array.from(fileWorkerMap.entries())
        .filter(([, workers]) => workers.length > 1)
        .map(([file, workers]) => ({ file, workers }));
}
export function getWorkerChangedFiles(cwd, baseBranch, workerBranch) {
    const diff = exec(`git diff --name-only "${baseBranch}...${workerBranch}"`, cwd);
    if (!diff.ok)
        return [];
    return diff.stdout.split("\n").filter(Boolean);
}
export function checkMergeability(cwd, baseBranch, workerBranch) {
    // Dry-run merge to check for conflicts
    const result = exec(`git merge-tree $(git merge-base "${baseBranch}" "${workerBranch}") "${baseBranch}" "${workerBranch}"`, cwd);
    if (!result.ok) {
        return { mergeable: false, conflictFiles: [] };
    }
    // Check for conflict markers in merge-tree output
    const conflicts = result.stdout.match(/^\+<<<<<<</gm);
    if (conflicts && conflicts.length > 0) {
        // Extract filenames from conflict sections
        const fileMatches = result.stdout.match(/^diff --git a\/(.+?) b\//gm) || [];
        const conflictFiles = fileMatches.map((m) => m.replace(/^diff --git a\//, "").replace(/ b\/.*/, ""));
        return { mergeable: false, conflictFiles: [...new Set(conflictFiles)] };
    }
    return { mergeable: true, conflictFiles: [] };
}
export function suggestMergeOrder(cwd, state) {
    const doneWorkers = state.workers.filter((w) => w.status === "done");
    if (doneWorkers.length === 0)
        return [];
    // Score workers: fewer file changes = merge first (less conflict risk)
    const scored = doneWorkers.map((w) => {
        const files = getWorkerChangedFiles(cwd, state.baseBranch, w.branch);
        return { id: w.id, fileCount: files.length };
    });
    scored.sort((a, b) => a.fileCount - b.fileCount);
    return scored.map((s) => s.id);
}
export function formatMergeReport(state, overlaps, mergeOrder) {
    const sections = [
        `[Team Merge Report: ${state.sessionName}]`,
        "",
    ];
    if (overlaps.length > 0) {
        sections.push("File Overlaps (potential conflicts):");
        for (const o of overlaps) {
            const workerNames = o.workers.map((id) => `worker-${id}`).join(", ");
            sections.push(`  ${o.file} — modified by ${workerNames}`);
        }
        sections.push("");
    }
    else {
        sections.push("No file overlaps detected — clean merge expected.");
        sections.push("");
    }
    sections.push("Suggested merge order (fewest changes first):");
    for (let i = 0; i < mergeOrder.length; i++) {
        const worker = state.workers.find((w) => w.id === mergeOrder[i]);
        if (worker) {
            sections.push(`  ${i + 1}. ${worker.name} (branch: ${worker.branch})`);
        }
    }
    sections.push("");
    sections.push("Merge command:");
    sections.push(`  bash "\${CLAUDE_PLUGIN_ROOT}/scripts/team-merge.sh" "${state.sessionName}" "${state.baseBranch}"`);
    sections.push("");
    sections.push("Or merge manually:");
    for (const id of mergeOrder) {
        const worker = state.workers.find((w) => w.id === id);
        if (worker) {
            sections.push(`  git merge ${worker.branch}  # ${worker.name}`);
        }
    }
    return sections.join("\n");
}
