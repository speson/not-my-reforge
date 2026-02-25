// session-state-save.ts — Save session state on session end
// Event: Stop (async, non-blocking)

import { readStdin } from "../lib/io.js";
import { saveSessionState, loadSessionState } from "../lib/session-state/storage.js";
import type { StopInput } from "../lib/types.js";

async function main() {
  const input = await readStdin<StopInput>();
  const cwd = input.cwd;

  if (!cwd) process.exit(0);

  const state = loadSessionState(cwd);
  state.lastCheckpoint = new Date().toISOString();

  saveSessionState(cwd, state);
}

main();
