// sidebar-open.ts — Auto-open sidebar pane on session start
// Event: SessionStart (startup|resume)
import { readStdin } from "../lib/io.js";
import { execSync } from "node:child_process";
import { unlinkSync } from "node:fs";
const PANE_TITLE = "reforge-sidebar";
async function main() {
    const input = await readStdin();
    const cwd = input.cwd;
    if (!cwd)
        process.exit(0);
    if (!process.env.TMUX)
        process.exit(0);
    try {
        // Check if sidebar pane already exists
        const panes = execSync("tmux list-panes -F '#{pane_title}'", {
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"],
        }).trim();
        if (panes.split("\n").includes(PANE_TITLE)) {
            process.exit(0);
        }
        // Remove stale close signal from previous session
        try {
            unlinkSync(`${cwd}/.reforge/sidebar-close-signal`);
        }
        catch {
            // file doesn't exist — fine
        }
        // Spawn sidebar pane (right side, 40 cols, detached)
        const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT ?? "";
        const script = `${pluginRoot}/scripts/sidebar-pane.sh`;
        // Split first, then set title on the new pane
        execSync(`tmux split-window -h -l 40 -d "bash '${script}' '${cwd}'"`, { stdio: ["pipe", "pipe", "pipe"] });
        // Get the index of the last pane (the one we just created) and set its title
        const lastPane = execSync("tmux list-panes -F '#{pane_index}' | tail -1", {
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"],
        }).trim();
        execSync(`tmux select-pane -t ${lastPane} -T '${PANE_TITLE}'`, {
            stdio: ["pipe", "pipe", "pipe"],
        });
    }
    catch {
        // tmux not available or split failed — silent exit
    }
}
main();
