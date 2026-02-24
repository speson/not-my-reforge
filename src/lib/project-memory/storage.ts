// Project memory persistence in .reforge/project-memory.json

import { readDataFile, writeDataFile } from "../storage.js";
import type { ProjectMemory } from "./types.js";
import { createDefaultMemory } from "./types.js";

const FILENAME = "project-memory.json";

export function loadProjectMemory(cwd: string): ProjectMemory {
  return readDataFile<ProjectMemory>(cwd, FILENAME, createDefaultMemory());
}

export function saveProjectMemory(cwd: string, memory: ProjectMemory): void {
  memory.lastUpdated = new Date().toISOString();
  writeDataFile(cwd, FILENAME, memory);
}

export function mergeMemory(existing: ProjectMemory, detected: ProjectMemory): ProjectMemory {
  // Merge tech stack (union)
  const techStack = [...new Set([...existing.techStack, ...detected.techStack])];

  // Merge build commands (detected overwrites, existing fills gaps)
  const buildCommands = { ...existing.buildCommands, ...detected.buildCommands };

  // Keep existing conventions, add new detected ones
  const conventions = [...existing.conventions];

  // Merge hot paths (union)
  const hotPaths = [...new Set([...existing.hotPaths, ...detected.hotPaths])];

  return {
    techStack,
    buildCommands,
    conventions,
    hotPaths,
    lastUpdated: new Date().toISOString(),
  };
}
