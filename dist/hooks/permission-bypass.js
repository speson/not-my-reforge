// permission-bypass.ts — Smart permission decisions: yolo bypass + context-based auto-allow
// Event: PermissionRequest
import { readStdin, writeOutput } from "../lib/io.js";
import { isYoloEnabled } from "../lib/yolo/settings.js";
// Read-only bash commands that are safe to auto-approve
const SAFE_BASH_PATTERNS = [
    /^\s*(git\s+(status|log|diff|branch|show|rev-parse|worktree\s+list))/,
    /^\s*(ls|pwd|echo|cat|head|tail|wc|which|command\s+-v|type\s+)/,
    /^\s*(node\s+--version|npm\s+--version|npx\s+--version)/,
    /^\s*(npm\s+(run\s+build|run\s+test|run\s+lint|test|run\s+typecheck))/,
    /^\s*(npx\s+tsc\s+--noEmit)/,
    /^\s*(find|grep|rg|ag|fd)\s/,
];
function isSafeBashCommand(command) {
    return SAFE_BASH_PATTERNS.some((p) => p.test(command));
}
function isInternalStatePath(filePath) {
    return filePath.includes("/.reforge/") || filePath.includes("\\.reforge\\");
}
function evaluatePermission(input) {
    const tool = input.tool_name;
    const toolInput = input.tool_input || {};
    // Bash: auto-allow known read-only commands
    if (tool === "Bash") {
        const command = toolInput.command || "";
        if (isSafeBashCommand(command)) {
            return { allow: true, reason: `safe-bash: ${command.slice(0, 50)}` };
        }
    }
    // Write/Edit to .reforge/ internal state files: auto-allow
    if (tool === "Write" || tool === "Edit") {
        const filePath = toolInput.file_path || "";
        if (isInternalStatePath(filePath)) {
            return { allow: true, reason: `internal-state: ${filePath}` };
        }
    }
    // Read-only tools should never need permission, but handle just in case
    if (tool === "Read" || tool === "Glob" || tool === "Grep") {
        return { allow: true, reason: `read-only-tool: ${tool}` };
    }
    return null; // No smart decision — fall through to normal permission dialog
}
async function main() {
    const input = await readStdin();
    const cwd = input.cwd;
    if (!cwd)
        process.exit(0);
    // Yolo mode: unconditional allow for everything
    if (isYoloEnabled(cwd)) {
        writeOutput({
            hookSpecificOutput: {
                hookEventName: "PermissionRequest",
                decision: { behavior: "allow" },
            },
        });
        return;
    }
    // Smart auto-allow based on context
    const decision = evaluatePermission(input);
    if (decision?.allow) {
        writeOutput({
            hookSpecificOutput: {
                hookEventName: "PermissionRequest",
                decision: { behavior: "allow" },
            },
        });
        return;
    }
    // No smart decision — let normal permission dialog proceed
    process.exit(0);
}
main();
