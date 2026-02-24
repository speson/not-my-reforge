// hud-update.ts — Update tmux HUD statusline (async, non-blocking)
// Event: PostToolUse (async)
import { readStdin } from "../lib/io.js";
import { loadMetrics } from "../lib/metrics/tracker.js";
import { buildHudState, formatHudForTmux } from "../lib/metrics/hud.js";
import { readDataFile } from "../lib/storage.js";
import { execSync } from "node:child_process";
async function main() {
    const input = await readStdin();
    const cwd = input.cwd;
    if (!cwd)
        process.exit(0);
    // Only update if in tmux
    if (!process.env.TMUX)
        process.exit(0);
    const metrics = loadMetrics(cwd);
    // Detect active mode
    let activeMode = "normal";
    const ralphState = readDataFile(cwd, "ralph-state.json", null);
    if (ralphState?.active)
        activeMode = "ralph";
    const teamState = readDataFile(cwd, "team-state.json", null);
    if (teamState?.active)
        activeMode = `team:${teamState.stage}`;
    const hudState = buildHudState(metrics, activeMode);
    const statusLine = formatHudForTmux(hudState);
    try {
        execSync(`tmux set-option -g status-right " ${statusLine} "`, {
            stdio: ["pipe", "pipe", "pipe"],
        });
    }
    catch {
        // tmux not available or not in session
    }
}
main();
