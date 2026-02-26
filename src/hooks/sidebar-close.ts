// sidebar-close.ts — Close sidebar pane on session stop
// Event: Stop (async)

import { execSync } from "node:child_process";

const PANE_TITLE = "reforge-sidebar";

async function main() {
  if (!process.env.TMUX) process.exit(0);

  try {
    // Find sidebar pane by title and kill it
    const panes = execSync(
      "tmux list-panes -F '#{pane_id} #{pane_title}'",
      { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
    ).trim();

    for (const line of panes.split("\n")) {
      const [paneId, ...titleParts] = line.split(" ");
      if (titleParts.join(" ") === PANE_TITLE) {
        execSync(`tmux kill-pane -t ${paneId}`, {
          stdio: ["pipe", "pipe", "pipe"],
        });
        break;
      }
    }
  } catch {
    // tmux not available or pane already gone — silent exit
  }
}

main();
