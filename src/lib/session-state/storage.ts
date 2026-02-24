// Session state persistence in .reforge/session-state.json

import { readDataFile, writeDataFile, dataFileExists } from "../storage.js";
import type { SessionState } from "./types.js";
import { createDefaultState } from "./types.js";

const FILENAME = "session-state.json";

export function loadSessionState(cwd: string): SessionState {
  return readDataFile<SessionState>(cwd, FILENAME, createDefaultState());
}

export function saveSessionState(cwd: string, state: SessionState): void {
  state.lastCheckpoint = new Date().toISOString();
  writeDataFile(cwd, FILENAME, state);
}

export function hasSessionState(cwd: string): boolean {
  return dataFileExists(cwd, FILENAME);
}
