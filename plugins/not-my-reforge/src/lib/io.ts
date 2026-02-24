// Stdin/stdout/stderr I/O utilities for hooks

import type { HookInput, HookOutput } from "./types.js";

export async function readStdin<T extends HookInput = HookInput>(): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  const raw = Buffer.concat(chunks).toString("utf-8").trim();
  if (!raw) {
    return {} as T;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return {} as T;
  }
}

export function writeOutput(output: HookOutput): void {
  process.stdout.write(JSON.stringify(output, null, 2) + "\n");
}

export function writeError(message: string): void {
  process.stderr.write(message + "\n");
}
