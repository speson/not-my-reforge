// Tests for src/lib/verification/checker.ts
// Run: npx tsx --test src/lib/__tests__/verification-checker.test.ts

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { runVerification } from "../verification/checker.js";
import type { TranscriptMessage } from "../types.js";

// Helper: build a transcript message with a Bash tool_use + result pair
function bashMsg(command: string, output: string, isError = false, timestamp?: number): TranscriptMessage {
  return {
    role: "assistant",
    timestamp,
    content: [
      {
        type: "tool_use",
        name: "Bash",
        input: { command },
      },
      {
        type: "tool_result",
        content: output,
        is_error: isError,
      },
    ],
  };
}

// Helper: build a transcript with a Write tool_use (to simulate code changes)
function writeMsg(filePath: string): TranscriptMessage {
  return {
    role: "assistant",
    content: [
      {
        type: "tool_use",
        name: "Write",
        input: { file_path: filePath },
      },
    ],
  };
}

// Use a temp dir that is NOT a git repo so git commands fail gracefully
const NON_GIT_CWD = "/tmp";

describe("verification checker — extractBashExecutions (via runVerification)", () => {
  it("empty transcript results in all skipped", () => {
    const report = runVerification(NON_GIT_CWD, []);
    const statuses = report.results.map((r) => r.status);
    // No write tool use and no executions => all skip
    assert.ok(statuses.every((s) => s === "skip"), `Expected all skip, got ${JSON.stringify(statuses)}`);
  });

  it("transcript with only text messages skips build/test/lint", () => {
    const transcript: TranscriptMessage[] = [
      { role: "assistant", content: "I will help you." },
      { role: "user", content: "Thanks." },
    ];
    const report = runVerification(NON_GIT_CWD, transcript);
    const buildResult = report.results.find((r) => r.check === "BUILD");
    assert.equal(buildResult?.status, "skip");
  });
});

describe("verification checker — checkExecution (via runVerification)", () => {
  it("finds passing npm run build", () => {
    // Include a Write to trigger code-change path
    const transcript: TranscriptMessage[] = [
      writeMsg("/tmp/foo.ts"),
      bashMsg("npm run build", "BUILD SUCCESS\n0 errors", false, Date.now()),
    ];
    const report = runVerification(NON_GIT_CWD, transcript);
    const buildResult = report.results.find((r) => r.check === "BUILD");
    assert.equal(buildResult?.status, "pass", `Expected pass, got ${buildResult?.status} (${buildResult?.evidence})`);
  });

  it("marks build as fail when exit code non-zero (isError=true)", () => {
    const transcript: TranscriptMessage[] = [
      writeMsg("/tmp/foo.ts"),
      bashMsg("npm run build", "Error: some error", true, Date.now()),
    ];
    const report = runVerification(NON_GIT_CWD, transcript);
    const buildResult = report.results.find((r) => r.check === "BUILD");
    assert.equal(buildResult?.status, "fail");
  });

  it("finds passing npm test", () => {
    const transcript: TranscriptMessage[] = [
      writeMsg("/tmp/foo.ts"),
      bashMsg("npm run build", "BUILD SUCCESS", false, Date.now()),
      bashMsg("npm test", "10 passed\n0 failed", false, Date.now()),
    ];
    const report = runVerification(NON_GIT_CWD, transcript);
    const testResult = report.results.find((r) => r.check === "TEST");
    assert.equal(testResult?.status, "pass");
  });

  it("finds passing lint command", () => {
    const transcript: TranscriptMessage[] = [
      writeMsg("/tmp/foo.ts"),
      bashMsg("npm run build", "success", false, Date.now()),
      bashMsg("npm run lint", "0 errors", false, Date.now()),
    ];
    const report = runVerification(NON_GIT_CWD, transcript);
    const lintResult = report.results.find((r) => r.check === "LINT");
    assert.equal(lintResult?.status, "pass");
  });

  it("marks build stale when timestamp > 5 minutes old", () => {
    const staleTimestamp = Date.now() - 6 * 60 * 1000; // 6 minutes ago
    const transcript: TranscriptMessage[] = [
      writeMsg("/tmp/foo.ts"),
      bashMsg("npm run build", "BUILD SUCCESS", false, staleTimestamp),
    ];
    const report = runVerification(NON_GIT_CWD, transcript);
    const buildResult = report.results.find((r) => r.check === "BUILD");
    assert.equal(buildResult?.status, "fail");
    assert.ok(buildResult?.evidence?.includes("5 minutes"), `Expected stale evidence, got: ${buildResult?.evidence}`);
  });

  it("no timestamp on bash exec is treated as fresh", () => {
    // When timestamp is undefined, freshness check is skipped
    const transcript: TranscriptMessage[] = [
      writeMsg("/tmp/foo.ts"),
      bashMsg("npm run build", "BUILD SUCCESS", false, undefined),
    ];
    const report = runVerification(NON_GIT_CWD, transcript);
    const buildResult = report.results.find((r) => r.check === "BUILD");
    // No timestamp means no freshness check — should fall through to pass/fail by output
    assert.equal(buildResult?.status, "pass");
  });
});

describe("verification checker — runVerification", () => {
  it("skips build/test/lint when no code changes and no write tool use", () => {
    // No Write/Edit tool use in transcript + NON_GIT_CWD has no git state
    // so hasCodeChanges returns true (git fails) — but no build-related execs exist
    const transcript: TranscriptMessage[] = [
      bashMsg("ls -la", "file1.ts\nfile2.ts", false, Date.now()),
    ];
    const report = runVerification(NON_GIT_CWD, transcript);
    const buildResult = report.results.find((r) => r.check === "BUILD");
    // No build-related commands in transcript => skipBuildTestLint = true
    assert.equal(buildResult?.status, "skip");
  });

  it("with Write but no build commands, build/test/lint are skipped", () => {
    const transcript: TranscriptMessage[] = [
      writeMsg("/tmp/foo.ts"),
      bashMsg("ls -la", "file1.ts", false, Date.now()),
    ];
    const report = runVerification(NON_GIT_CWD, transcript);
    const buildResult = report.results.find((r) => r.check === "BUILD");
    // codeChanged=true, executions exist, but no build pattern matches => skip
    assert.equal(buildResult?.status, "skip");
  });

  it("allPassed is true when all results are pass or skip", () => {
    const transcript: TranscriptMessage[] = [];
    const report = runVerification(NON_GIT_CWD, transcript);
    // All skip counts as passed (failures.length === 0)
    assert.equal(report.allPassed, true);
  });

  it("allPassed is false when any result is fail", () => {
    const staleTimestamp = Date.now() - 10 * 60 * 1000;
    const transcript: TranscriptMessage[] = [
      writeMsg("/tmp/foo.ts"),
      bashMsg("npm run build", "BUILD SUCCESS", false, staleTimestamp),
    ];
    const report = runVerification(NON_GIT_CWD, transcript);
    assert.equal(report.allPassed, false);
  });

  it("summary is informative when checks fail", () => {
    const staleTimestamp = Date.now() - 10 * 60 * 1000;
    const transcript: TranscriptMessage[] = [
      writeMsg("/tmp/foo.ts"),
      bashMsg("npm run build", "BUILD SUCCESS", false, staleTimestamp),
    ];
    const report = runVerification(NON_GIT_CWD, transcript);
    assert.ok(report.summary.length > 0);
    assert.notEqual(report.summary, "All verification checks passed.");
  });
});
