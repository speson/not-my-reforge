import { readDataFile, writeDataFile } from "../storage.js";
import { DEFAULT_YOLO, YOLO_FILE } from "./types.js";
export function readYolo(cwd) {
    return readDataFile(cwd, YOLO_FILE, DEFAULT_YOLO);
}
export function writeYolo(cwd, settings) {
    writeDataFile(cwd, YOLO_FILE, settings);
}
export function isYoloEnabled(cwd) {
    return readYolo(cwd).enabled;
}
