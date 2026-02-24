// todo-enforcer.ts — Block session stop if changed files contain unresolved TODOs
// Event: Stop

import { readStdin, writeError } from "../lib/io.js";
import { existsSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import type { StopInput } from "../lib/types.js";

const TODO_REGEX = /(TODO|FIXME|HACK|XXX)(\(|:|\s)/;

const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".gif", ".ico", ".woff", ".woff2",
  ".ttf", ".eot", ".lock", ".min.js", ".min.css",
]);

function isBinary(file: string): boolean {
  for (const ext of BINARY_EXTENSIONS) {
    if (file.endsWith(ext)) return true;
  }
  return false;
}

function exec(cmd: string, cwd: string): string {
  try {
    return execSync(cmd, { cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch {
    return "";
  }
}

async function main() {
  const input = await readStdin<StopInput>();
  const cwd = input.cwd;

  if (!cwd || !existsSync(cwd)) process.exit(0);

  // Check if we're in a git repo
  const isGit = exec("git rev-parse --is-inside-work-tree", cwd);
  if (isGit !== "true") process.exit(0);

  // Get changed files
  const changed = exec("git diff --name-only HEAD", cwd);
  const staged = exec("git diff --cached --name-only", cwd);
  const untracked = exec("git ls-files --others --exclude-standard", cwd);

  const allFiles = new Set(
    [changed, staged, untracked]
      .join("\n")
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean)
  );

  if (allFiles.size === 0) process.exit(0);

  interface TodoEntry {
    file: string;
    lines: string[];
    count: number;
  }

  const todoFiles: TodoEntry[] = [];
  let totalCount = 0;

  for (const file of allFiles) {
    if (isBinary(file)) continue;

    const fullPath = `${cwd}/${file}`;
    if (!existsSync(fullPath)) continue;

    let content: string;
    try {
      content = readFileSync(fullPath, "utf-8");
    } catch {
      continue;
    }

    const lines = content.split("\n");
    const todoLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      if (TODO_REGEX.test(lines[i])) {
        todoLines.push(`  ${i + 1}: ${lines[i].trim()}`);
      }
    }

    if (todoLines.length > 0) {
      totalCount += todoLines.length;
      todoFiles.push({
        file,
        lines: todoLines.slice(0, 5),
        count: todoLines.length,
      });
    }
  }

  if (totalCount > 0) {
    const report = todoFiles
      .map((t) => {
        let entry = `${t.file} (${t.count} items):\n${t.lines.join("\n")}`;
        if (t.count > 5) entry += `\n  ... and ${t.count - 5} more`;
        return entry;
      })
      .join("\n");

    writeError(
      [
        `Cannot stop: ${totalCount} unresolved TODO/FIXME found in changed files.`,
        report,
        "",
        "Please resolve these TODOs before finishing:",
        "  1. Implement the TODO items, OR",
        "  2. Remove them if no longer needed, OR",
        "  3. Convert to tracked issues (e.g., GitHub issues)",
      ].join("\n")
    );
    process.exit(2);
  }
}

main();
