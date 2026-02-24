// Session state persistence in .reforge/session-state.json
import { readDataFile, writeDataFile, dataFileExists } from "../storage.js";
import { createDefaultState } from "./types.js";
const FILENAME = "session-state.json";
export function loadSessionState(cwd) {
    return readDataFile(cwd, FILENAME, createDefaultState());
}
export function saveSessionState(cwd, state) {
    state.lastCheckpoint = new Date().toISOString();
    writeDataFile(cwd, FILENAME, state);
}
export function hasSessionState(cwd) {
    return dataFileExists(cwd, FILENAME);
}
