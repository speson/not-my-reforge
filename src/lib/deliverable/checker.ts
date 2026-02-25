// Deliverable checker — verify outputs meet acceptance criteria

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { glob } from "node:fs";
import type { Deliverable, DeliverableResult, DeliverableReport, AcceptanceCriterion } from "./types.js";

function exec(cmd: string, cwd: string): { stdout: string; ok: boolean } {
  try {
    const stdout = execSync(cmd, { cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"], timeout: 60000 }).trim();
    return { stdout, ok: true };
  } catch (e: unknown) {
    const error = e as { stdout?: string; stderr?: string };
    return { stdout: error.stdout || error.stderr || "", ok: false };
  }
}

function checkFileExists(cwd: string, pattern: string): DeliverableResult {
  // Simple check: if pattern contains glob chars, try direct path
  const fullPath = pattern.startsWith("/") ? pattern : `${cwd}/${pattern}`;

  if (existsSync(fullPath)) {
    return { deliverable: "", criterion: `File exists: ${pattern}`, passed: true, detail: "Found" };
  }

  // Try as glob via ls
  const result = exec(`ls ${fullPath} 2>/dev/null`, cwd);
  if (result.ok && result.stdout) {
    return { deliverable: "", criterion: `File exists: ${pattern}`, passed: true, detail: result.stdout.split("\n")[0] };
  }

  return { deliverable: "", criterion: `File exists: ${pattern}`, passed: false, detail: "Not found" };
}

function checkCommand(cwd: string, command: string, label: string): DeliverableResult {
  const result = exec(command, cwd);
  return {
    deliverable: "",
    criterion: label,
    passed: result.ok,
    detail: result.ok ? "Passed" : result.stdout.split("\n").slice(0, 3).join("\n"),
  };
}

function checkCriterion(cwd: string, criterion: AcceptanceCriterion): DeliverableResult {
  switch (criterion.type) {
    case "file_exists":
      return checkFileExists(cwd, criterion.value);
    case "test_passes":
      return checkCommand(cwd, criterion.value, `Tests: ${criterion.description}`);
    case "build_succeeds":
      return checkCommand(cwd, criterion.value, `Build: ${criterion.description}`);
    case "no_errors":
      return checkCommand(cwd, criterion.value, `No errors: ${criterion.description}`);
    case "custom":
      return checkCommand(cwd, criterion.value, criterion.description);
  }
}

export function verifyDeliverable(cwd: string, deliverable: Deliverable): DeliverableResult[] {
  return deliverable.criteria.map((c) => {
    const result = checkCriterion(cwd, c);
    result.deliverable = deliverable.name;
    result.criterion = c.description;
    return result;
  });
}

export function verifyAll(cwd: string, deliverables: Deliverable[]): DeliverableReport {
  const results: DeliverableResult[] = [];

  for (const d of deliverables) {
    results.push(...verifyDeliverable(cwd, d));
  }

  const passCount = results.filter((r) => r.passed).length;
  const failCount = results.filter((r) => !r.passed).length;
  const allPassed = failCount === 0;

  const summary = allPassed
    ? `All ${passCount} criteria passed.`
    : `${failCount}/${results.length} criteria failed.`;

  return { deliverables: results, allPassed, passCount, failCount, summary };
}

export function formatDeliverableReport(report: DeliverableReport): string {
  const lines = [
    `[Deliverable Verification: ${report.summary}]`,
    "",
  ];

  for (const r of report.deliverables) {
    const icon = r.passed ? "[PASS]" : "[FAIL]";
    lines.push(`${icon} ${r.deliverable}: ${r.criterion}`);
    if (!r.passed && r.detail) {
      lines.push(`       ${r.detail}`);
    }
  }

  return lines.join("\n");
}
