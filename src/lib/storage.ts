// .reforge/ directory CRUD with atomic writes

import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";

const DATA_DIR = ".reforge";

export function getDataDir(cwd: string): string {
  const dir = join(cwd, DATA_DIR);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function readDataFile<T>(cwd: string, filename: string, fallback: T): T {
  const filePath = join(getDataDir(cwd), filename);
  if (!existsSync(filePath)) {
    return fallback;
  }
  try {
    const content = readFileSync(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch {
    return fallback;
  }
}

export function writeDataFile(cwd: string, filename: string, data: unknown): void {
  const dir = getDataDir(cwd);
  const filePath = join(dir, filename);

  // Atomic write: write to temp file then rename
  const tmpFile = join(tmpdir(), `reforge-${randomBytes(6).toString("hex")}.tmp`);
  const content = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  writeFileSync(tmpFile, content, "utf-8");

  // Ensure parent directory exists
  const parent = dirname(filePath);
  if (!existsSync(parent)) {
    mkdirSync(parent, { recursive: true });
  }

  renameSync(tmpFile, filePath);
}

export function readDataText(cwd: string, filename: string, fallback: string = ""): string {
  const filePath = join(getDataDir(cwd), filename);
  if (!existsSync(filePath)) {
    return fallback;
  }
  try {
    return readFileSync(filePath, "utf-8");
  } catch {
    return fallback;
  }
}

export function dataFileExists(cwd: string, filename: string): boolean {
  return existsSync(join(getDataDir(cwd), filename));
}
