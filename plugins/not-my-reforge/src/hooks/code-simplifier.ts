// code-simplifier.ts — Suggest code simplifications (async, non-blocking)
// Event: Stop (async: true)

import { readStdin, writeOutput } from "../lib/io.js";
import { existsSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import type { StopInput } from "../lib/types.js";

interface ComplexityIssue {
  file: string;
  issue: string;
  line?: number;
}

function exec(cmd: string, cwd: string): string {
  try {
    return execSync(cmd, { cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch {
    return "";
  }
}

function analyzeComplexity(filePath: string, content: string): ComplexityIssue[] {
  const issues: ComplexityIssue[] = [];
  const lines = content.split("\n");

  // Check for long functions (> 50 lines)
  let funcStart = -1;
  let braceDepth = 0;
  let funcName = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect function start
    const funcMatch = line.match(/(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[^=])\s*=>|(\w+)\s*\([^)]*\)\s*\{)/);
    if (funcMatch && braceDepth === 0) {
      funcStart = i;
      funcName = funcMatch[1] || funcMatch[2] || funcMatch[3] || "anonymous";
    }

    braceDepth += (line.match(/\{/g) || []).length;
    braceDepth -= (line.match(/\}/g) || []).length;

    if (funcStart >= 0 && braceDepth === 0) {
      const funcLength = i - funcStart + 1;
      if (funcLength > 50) {
        issues.push({
          file: filePath,
          issue: `Function '${funcName}' is ${funcLength} lines long (consider breaking into smaller functions)`,
          line: funcStart + 1,
        });
      }
      funcStart = -1;
    }

    // Check for deeply nested conditionals (> 4 levels)
    const indent = line.match(/^(\s*)/)?.[1].length || 0;
    const spaces = indent;
    if (spaces > 16 && (line.includes("if ") || line.includes("for ") || line.includes("while "))) {
      issues.push({
        file: filePath,
        issue: "Deeply nested control flow (consider early returns or extracting logic)",
        line: i + 1,
      });
    }
  }

  return issues;
}

async function main() {
  const input = await readStdin<StopInput>();
  const cwd = input.cwd;

  if (!cwd) process.exit(0);

  const isGit = exec("git rev-parse --is-inside-work-tree", cwd);
  if (isGit !== "true") process.exit(0);

  const changed = exec("git diff --name-only HEAD", cwd);
  if (!changed) process.exit(0);

  const files = changed.split("\n").filter((f) =>
    f.endsWith(".ts") || f.endsWith(".tsx") || f.endsWith(".js") || f.endsWith(".jsx")
  );

  const allIssues: ComplexityIssue[] = [];

  for (const file of files.slice(0, 10)) {
    const fullPath = `${cwd}/${file}`;
    if (!existsSync(fullPath)) continue;

    try {
      const content = readFileSync(fullPath, "utf-8");
      allIssues.push(...analyzeComplexity(file, content));
    } catch { /* skip */ }
  }

  if (allIssues.length > 0) {
    const report = allIssues
      .slice(0, 5)
      .map((i) => `  - ${i.file}:${i.line || "?"} — ${i.issue}`)
      .join("\n");

    writeOutput({
      hookSpecificOutput: {
        hookEventName: "Stop" as const,
        additionalContext: `[Code Simplification Suggestions]\n${report}`,
      },
    });
  }
}

main();
