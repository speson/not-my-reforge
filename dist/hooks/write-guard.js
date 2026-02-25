// write-guard.ts — Block Write tool on existing files + file ownership check
// Event: PreToolUse (Write)
import { readStdin, writeOutput } from "../lib/io.js";
import { existsSync, readFileSync } from "node:fs";
import { basename } from "node:path";
import { isLocked } from "../lib/file-ownership/registry.js";
import { isYoloEnabled } from "../lib/yolo/settings.js";
const REGENERATED_EXTENSIONS = new Set([
    ".lock", ".sum", ".min.js", ".min.css", ".map",
]);
const REGENERATED_FILENAMES = new Set([
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
    "Cargo.lock", "go.sum", "composer.lock",
]);
function isRegeneratedFile(filePath) {
    const name = basename(filePath);
    if (REGENERATED_FILENAMES.has(name))
        return true;
    if (name.includes(".generated.") || name.endsWith(".g.dart"))
        return true;
    for (const ext of REGENERATED_EXTENSIONS) {
        if (name.endsWith(ext))
            return true;
    }
    return false;
}
async function main() {
    const input = await readStdin();
    const filePath = input.tool_input?.file_path;
    const cwd = input.cwd;
    if (!filePath)
        process.exit(0);
    // Yolo mode: bypass write guard but keep file ownership lock
    const yoloActive = cwd ? isYoloEnabled(cwd) : false;
    // Check file ownership lock (parallel agent conflict prevention)
    if (cwd) {
        const lock = isLocked(cwd, filePath);
        if (lock) {
            const agentId = process.env.CLAUDE_AGENT_ID || "main";
            if (lock.owner !== agentId) {
                writeOutput({
                    hookSpecificOutput: {
                        hookEventName: "PreToolUse",
                        permissionDecision: "deny",
                        permissionDecisionReason: `File locked by agent "${lock.owner}". Wait for the lock to be released or use "reforge cancel" to clear locks. File: ${basename(filePath)}`,
                    },
                });
                return;
            }
        }
    }
    if (yoloActive)
        process.exit(0);
    if (!existsSync(filePath))
        process.exit(0);
    // Count lines
    let lineCount = 0;
    try {
        const content = readFileSync(filePath, "utf-8");
        lineCount = content.split("\n").length;
    }
    catch {
        process.exit(0);
    }
    // Allow overwriting very small files (< 5 lines)
    if (lineCount < 5)
        process.exit(0);
    // Allow regenerated files
    if (isRegeneratedFile(filePath))
        process.exit(0);
    const name = basename(filePath);
    writeOutput({
        hookSpecificOutput: {
            hookEventName: "PreToolUse",
            permissionDecision: "deny",
            permissionDecisionReason: `Write blocked on existing file '${name}' (${lineCount} lines). Use the Edit tool instead to make targeted changes. Write overwrites the entire file and risks losing content.`,
        },
    });
}
main();
