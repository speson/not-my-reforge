// sidebar-close.ts — Close sidebar pane on session stop
// Event: Stop (async)
import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
const PANE_TITLE = "reforge-sidebar";
function isAnotherClaudeAlive() {
    if (!process.env.TMUX)
        return false;
    try {
        // Check panes in the current window only (not -a)
        const panes = execSync(`tmux list-panes -F '#{pane_title}|#{pane_current_command}'`, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
        for (const line of panes.split("\n")) {
            const [title, cmd] = line.split("|");
            if (title === PANE_TITLE)
                continue; // skip sidebar itself
            // A non-shell command means another Claude (or similar) is still running
            if (cmd && !["bash", "zsh", "sh", "fish", "-bash", "-zsh", ""].includes(cmd)) {
                return true;
            }
        }
    }
    catch {
        // tmux not available — assume no other Claude
    }
    return false;
}
function main() {
    let cwd = process.cwd();
    try {
        const raw = readFileSync("/dev/stdin", "utf-8");
        const input = JSON.parse(raw);
        if (input.cwd)
            cwd = input.cwd;
    }
    catch {
        // stdin may not be available
    }
    // If another Claude process is still running in the same tmux window,
    // don't close the sidebar — it belongs to that session
    if (isAnotherClaudeAlive()) {
        process.exit(0);
    }
    // Signal file — sidebar-pane.sh polls for this and exits immediately
    try {
        const reforgeDir = `${cwd}/.reforge`;
        mkdirSync(reforgeDir, { recursive: true });
        writeFileSync(`${reforgeDir}/sidebar-close-signal`, "", { flag: "w" });
    }
    catch {
        // best-effort
    }
    if (!process.env.TMUX)
        process.exit(0);
    try {
        const panes = execSync("tmux list-panes -a -F '#{pane_id} #{pane_title}'", { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
        for (const line of panes.split("\n")) {
            const [paneId, ...titleParts] = line.split(" ");
            if (titleParts.join(" ") === PANE_TITLE) {
                execSync(`tmux kill-pane -t ${paneId}`, {
                    stdio: ["pipe", "pipe", "pipe"],
                });
                break;
            }
        }
    }
    catch {
        // tmux not available or pane already gone — signal file handles it
    }
}
main();
