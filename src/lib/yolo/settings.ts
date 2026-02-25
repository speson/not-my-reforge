import { readDataFile, writeDataFile } from "../storage.js";
import { DEFAULT_YOLO, YOLO_FILE } from "./types.js";
import type { YoloSettings } from "./types.js";

export function readYolo(cwd: string): YoloSettings {
  return readDataFile<YoloSettings>(cwd, YOLO_FILE, DEFAULT_YOLO);
}

export function writeYolo(cwd: string, settings: YoloSettings): void {
  writeDataFile(cwd, YOLO_FILE, settings);
}

export function isYoloEnabled(cwd: string): boolean {
  return readYolo(cwd).enabled;
}
