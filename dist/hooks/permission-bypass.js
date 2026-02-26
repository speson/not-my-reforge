// permission-bypass.ts — Smart permission decisions: yolo bypass + context-based auto-allow
// Event: PermissionRequest
import { readStdin, writeOutput } from "../lib/io.js";
import { isYoloEnabled } from "../lib/yolo/settings.js";
import { getTrustLevel } from "../lib/trust/tracker.js";
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
// Destructive bash commands that must never be auto-allowed by trust
const DESTRUCTIVE_BASH_PATTERNS = [
    /\brm\s+(-[a-zA-Z]*r[a-zA-Z]*f|--recursive.*--force|--force.*--recursive|-rf|-fr)\b/,
    /\bgit\s+(push\s+.*--force|push\s+.*-f\b)/,
    /\bgit\s+reset\s+--hard\b/,
    /\bgit\s+clean\s+-[a-zA-Z]*f/,
    /\bdrop\s+table\b/i,
    /\btruncate\s+table\b/i,
    /\bformat\s+[a-zA-Z]:\\/i,
    /\bmkfs\b/,
];
function isDestructiveBashCommand(command) {
    return DESTRUCTIVE_BASH_PATTERNS.some((p) => p.test(command));
}
// Bash commands safe to auto-allow at trust level >= 2 (build/test commands)
const BUILD_TEST_BASH_PATTERNS = [
    /^\s*npm\s+(run\s+build|run\s+test|test|run\s+lint|run\s+typecheck)\b/,
    /^\s*npx\s+tsc\b/,
    /^\s*yarn\s+(build|test|lint)\b/,
    /^\s*pnpm\s+(build|test|lint)\b/,
];
function isBuildOrTestCommand(command) {
    return BUILD_TEST_BASH_PATTERNS.some((p) => p.test(command));
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
function evaluateTrustPermission(input, trustLevel) {
    if (trustLevel < 1)
        return null;
    const tool = input.tool_name;
    const toolInput = input.tool_input || {};
    // Level >= 1: auto-allow Edit operations
    if (tool === "Edit") {
        return { allow: true, reason: `trust-level-${trustLevel}: Edit auto-approved` };
    }
    if (trustLevel >= 2) {
        // Level >= 2: auto-allow Write operations
        if (tool === "Write") {
            return { allow: true, reason: `trust-level-${trustLevel}: Write auto-approved` };
        }
        // Level >= 2: auto-allow build/test bash commands
        if (tool === "Bash") {
            const command = toolInput.command || "";
            if (isBuildOrTestCommand(command)) {
                return { allow: true, reason: `trust-level-${trustLevel}: build/test command auto-approved` };
            }
        }
    }
    if (trustLevel >= 3) {
        // Level >= 3: auto-allow most Bash commands except destructive ones
        if (tool === "Bash") {
            const command = toolInput.command || "";
            if (!isDestructiveBashCommand(command)) {
                return { allow: true, reason: `trust-level-3: bash auto-approved (non-destructive)` };
            }
        }
    }
    return null;
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
    // Trust-based auto-allow (after smart logic, before falling through)
    const trustLevel = getTrustLevel(cwd);
    const trustDecision = evaluateTrustPermission(input, trustLevel);
    if (trustDecision?.allow) {
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
