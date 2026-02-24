// Evidence-based verification checker
// Parses transcript for recent build/test/lint execution

import type { TranscriptMessage, TranscriptContent } from "../types.js";
import type { VerificationResult, VerificationReport } from "./types.js";
import { existsSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const FRESHNESS_MS = 5 * 60 * 1000; // 5 minutes

interface BashExecution {
  command: string;
  output: string;
  isError: boolean;
  timestamp?: number;
}

function extractBashExecutions(transcript: TranscriptMessage[]): BashExecution[] {
  const executions: BashExecution[] = [];

  for (const msg of transcript) {
    if (!Array.isArray(msg.content)) continue;

    for (const block of msg.content as TranscriptContent[]) {
      if (block.type === "tool_use" && block.name === "Bash" && block.input) {
        const cmd = (block.input as Record<string, unknown>).command as string;
        if (cmd) {
          executions.push({
            command: cmd,
            output: "",
            isError: false,
            timestamp: msg.timestamp,
          });
        }
      }

      if (block.type === "tool_result") {
        const lastExec = executions[executions.length - 1];
        if (lastExec && !lastExec.output) {
          lastExec.output = block.content || "";
          lastExec.isError = block.is_error || false;
        }
      }
    }
  }

  return executions;
}

const BUILD_PATTERNS = [
  /\bnpm\s+run\s+build\b/,
  /\bcargo\s+build\b/,
  /\bgo\s+build\b/,
  /\bmake\s*\b/,
  /\btsc\b/,
  /\bnpx\s+tsc\b/,
];

const TEST_PATTERNS = [
  /\bnpm\s+(run\s+)?test\b/,
  /\bnpx\s+(jest|vitest|mocha)\b/,
  /\bcargo\s+test\b/,
  /\bgo\s+test\b/,
  /\bpytest\b/,
  /\bmake\s+test\b/,
];

const LINT_PATTERNS = [
  /\bnpm\s+run\s+(lint|typecheck)\b/,
  /\bnpx\s+(eslint|tsc\s+--noEmit)\b/,
  /\bcargo\s+clippy\b/,
  /\bgolangci-lint\b/,
  /\bruff\s+check\b/,
];

const ERROR_PATTERNS = [
  /error:/i,
  /Error:/,
  /FAILED/,
  /FAIL\s/,
  /panic:/,
  /traceback/i,
  /exception/i,
  /segfault/i,
];

const PASS_PATTERNS = [
  /pass(ed)?/i,
  /success/i,
  /✓|✔/,
  /\d+\s+pass/i,
  /ok\s/i,
  /BUILD SUCCESS/i,
  /0 error/i,
];

function checkExecution(
  executions: BashExecution[],
  patterns: RegExp[],
  checkName: VerificationResult["check"]
): VerificationResult {
  const now = Date.now();

  for (let i = executions.length - 1; i >= 0; i--) {
    const exec = executions[i];
    const matchesCommand = patterns.some((p) => p.test(exec.command));
    if (!matchesCommand) continue;

    // Check freshness
    if (exec.timestamp && now - exec.timestamp > FRESHNESS_MS) {
      return { check: checkName, status: "fail", evidence: `Last ${checkName.toLowerCase()} was over 5 minutes ago` };
    }

    // Check if passed
    if (exec.isError) {
      return { check: checkName, status: "fail", evidence: `${checkName} failed: ${exec.output.slice(0, 100)}` };
    }

    const hasError = ERROR_PATTERNS.some((p) => p.test(exec.output));
    const hasPass = PASS_PATTERNS.some((p) => p.test(exec.output));

    if (hasError && !hasPass) {
      return { check: checkName, status: "fail", evidence: `${checkName} had errors` };
    }

    return { check: checkName, status: "pass", evidence: exec.command };
  }

  return { check: checkName, status: "fail", evidence: `No recent ${checkName.toLowerCase()} execution found` };
}

function checkTodos(cwd: string): VerificationResult {
  try {
    const isGit = execSync("git rev-parse --is-inside-work-tree", {
      cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"]
    }).trim();

    if (isGit !== "true") return { check: "TODO", status: "skip" };

    const changed = execSync("git diff --name-only HEAD", {
      cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"]
    }).trim();

    if (!changed) return { check: "TODO", status: "pass", evidence: "No changed files" };

    const files = changed.split("\n").filter(Boolean);
    let todoCount = 0;

    for (const file of files) {
      const fullPath = `${cwd}/${file}`;
      if (!existsSync(fullPath)) continue;
      try {
        const content = readFileSync(fullPath, "utf-8");
        const matches = content.match(/(TODO|FIXME|HACK|XXX)(\(|:|\s)/g);
        if (matches) todoCount += matches.length;
      } catch { /* skip */ }
    }

    if (todoCount > 0) {
      return { check: "TODO", status: "fail", evidence: `${todoCount} TODO/FIXME items in changed files` };
    }

    return { check: "TODO", status: "pass" };
  } catch {
    return { check: "TODO", status: "skip" };
  }
}

function checkErrorFree(transcript: TranscriptMessage[]): VerificationResult {
  // Check last assistant message for error patterns
  for (let i = transcript.length - 1; i >= 0; i--) {
    const msg = transcript[i];
    if (msg.role !== "assistant") continue;

    const text = typeof msg.content === "string"
      ? msg.content
      : (msg.content as TranscriptContent[])
          .filter((c) => c.type === "text")
          .map((c) => c.text)
          .join("\n");

    const hasError = ERROR_PATTERNS.some((p) => p.test(text));
    if (hasError) {
      return { check: "ERROR_FREE", status: "fail", evidence: "Last assistant message contains error patterns" };
    }

    return { check: "ERROR_FREE", status: "pass" };
  }

  return { check: "ERROR_FREE", status: "skip" };
}

export function runVerification(
  cwd: string,
  transcript: TranscriptMessage[]
): VerificationReport {
  const executions = extractBashExecutions(transcript);

  const results: VerificationResult[] = [
    checkExecution(executions, BUILD_PATTERNS, "BUILD"),
    checkExecution(executions, TEST_PATTERNS, "TEST"),
    checkExecution(executions, LINT_PATTERNS, "LINT"),
    checkTodos(cwd),
    checkErrorFree(transcript),
  ];

  const failures = results.filter((r) => r.status === "fail");
  const allPassed = failures.length === 0;

  const summary = allPassed
    ? "All verification checks passed."
    : failures
        .map((f) => {
          switch (f.check) {
            case "BUILD": return "Run the build command";
            case "TEST": return "Run the test suite";
            case "LINT": return "Run the linter";
            case "TODO": return "Resolve TODO/FIXME items";
            case "ERROR_FREE": return "Fix errors in the output";
          }
        })
        .join("; ");

  return { results, allPassed, summary };
}
