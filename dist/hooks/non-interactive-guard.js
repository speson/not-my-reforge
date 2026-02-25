// non-interactive-guard.ts — Block interactive commands that require TTY
// Event: PreToolUse (Bash)
import { readStdin, writeOutput } from "../lib/io.js";
import { isYoloEnabled } from "../lib/yolo/settings.js";
// Commands that require interactive TTY input
const INTERACTIVE_COMMANDS = new Set([
    "vim", "nvim", "vi", "nano", "emacs", "pico", "joe", "micro",
    "less", "more", "most",
    "top", "htop", "btop", "glances", "nmon",
    "tmux", "screen",
    "ssh", "telnet", "ftp",
    "python", "python3", "node", "irb", "ghci", "lua", "erl",
    "psql", "mysql", "sqlite3", "mongosh", "redis-cli",
    "gdb", "lldb",
    "man",
]);
// Patterns that indicate interactive flags
const INTERACTIVE_PATTERNS = [
    /\bgit\s+(rebase|add|stash)\s+.*-i\b/, // git rebase -i, git add -i
    /\bgit\s+log\s+(?!.*--oneline|.*--format)/, // bare git log (pager)
    /\bsudo\s+-[^-]*s\b/, // sudo -s (interactive shell)
    /\b(bash|zsh|sh|fish)\s*$/, // bare shell invocation
    /\bselect\s+.*\bin\b/, // bash select menu
    /\bread\s+-p\b/, // read -p (user prompt)
];
function extractBaseCommand(command) {
    // Strip env vars, sudo prefix, and pipes to get the first command
    const stripped = command
        .replace(/^\s*(?:sudo\s+)?(?:env\s+\S+=\S+\s+)*/, "")
        .replace(/\s*[|;&].*$/, "")
        .trim();
    const parts = stripped.split(/\s+/);
    if (parts.length === 0)
        return null;
    // Handle path prefixes like /usr/bin/vim
    const cmd = parts[0].split("/").pop() || parts[0];
    return cmd;
}
function isInteractive(command) {
    const baseCmd = extractBaseCommand(command);
    // Check exact command match
    if (baseCmd && INTERACTIVE_COMMANDS.has(baseCmd)) {
        // Allow these with specific non-interactive flags
        if (baseCmd === "python" || baseCmd === "python3" || baseCmd === "node") {
            // python script.py or python -c "..." is fine
            if (/\s+\S/.test(command.slice(command.indexOf(baseCmd) + baseCmd.length))) {
                return { blocked: false, reason: "" };
            }
        }
        if (baseCmd === "psql" || baseCmd === "mysql" || baseCmd === "sqlite3") {
            // Allow with -c flag (non-interactive query)
            if (/\s+-c\s/.test(command)) {
                return { blocked: false, reason: "" };
            }
        }
        if (baseCmd === "tmux") {
            // Allow tmux with subcommands (list-panes, split-window, etc.)
            if (/\btmux\s+\S/.test(command)) {
                return { blocked: false, reason: "" };
            }
        }
        if (baseCmd === "less" || baseCmd === "more") {
            // Allow less with pipe input (used in scripts)
            if (command.includes("|")) {
                return { blocked: false, reason: "" };
            }
        }
        return {
            blocked: true,
            reason: `'${baseCmd}' requires interactive TTY input`,
        };
    }
    // Check pattern-based detection
    for (const pattern of INTERACTIVE_PATTERNS) {
        if (pattern.test(command)) {
            return {
                blocked: true,
                reason: `Command matches interactive pattern: ${pattern.source}`,
            };
        }
    }
    return { blocked: false, reason: "" };
}
async function main() {
    const input = await readStdin();
    if (input.cwd && isYoloEnabled(input.cwd))
        process.exit(0);
    if (input.tool_name !== "Bash")
        process.exit(0);
    const command = input.tool_input?.command;
    if (!command)
        process.exit(0);
    const result = isInteractive(command);
    if (result.blocked) {
        writeOutput({
            hookSpecificOutput: {
                hookEventName: "PreToolUse",
                permissionDecision: "deny",
                permissionDecisionReason: `Interactive command blocked: ${result.reason}. Use non-interactive alternatives (e.g., 'git rebase' without -i, 'cat' instead of 'less', pass scripts/commands as arguments instead of launching a REPL).`,
            },
        });
    }
}
main();
