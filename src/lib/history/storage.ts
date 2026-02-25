// Session history storage — .reforge/session-history.json

import { readDataFile, writeDataFile } from "../storage.js";
import type { SessionRecord, SessionHistory } from "./types.js";
import { DEFAULT_HISTORY } from "./types.js";

const FILENAME = "session-history.json";

export function loadHistory(cwd: string): SessionHistory {
  return readDataFile<SessionHistory>(cwd, FILENAME, { ...DEFAULT_HISTORY, records: [] });
}

export function saveHistory(cwd: string, history: SessionHistory): void {
  writeDataFile(cwd, FILENAME, history);
}

export function appendRecord(cwd: string, record: SessionRecord): void {
  const history = loadHistory(cwd);
  history.records.push(record);

  // Trim to max
  if (history.records.length > history.maxRecords) {
    history.records = history.records.slice(-history.maxRecords);
  }

  saveHistory(cwd, history);
}

export function getRecentRecords(cwd: string, count = 10): SessionRecord[] {
  const history = loadHistory(cwd);
  return history.records.slice(-count);
}

export function formatHistorySummary(records: SessionRecord[]): string {
  if (records.length === 0) return "No session history found.";

  const lines = [
    `[Session History: ${records.length} session(s)]`,
    "",
  ];

  // Summary stats
  const totalDuration = records.reduce((sum, r) => sum + r.durationSec, 0);
  const totalCalls = records.reduce((sum, r) => sum + r.toolCalls, 0);
  const totalTokens = records.reduce((sum, r) => sum + r.estimatedTokens, 0);
  const avgDuration = Math.round(totalDuration / records.length);

  lines.push("Totals:");
  lines.push(`  Sessions: ${records.length}`);
  lines.push(`  Total time: ${formatDuration(totalDuration)}`);
  lines.push(`  Avg session: ${formatDuration(avgDuration)}`);
  lines.push(`  Tool calls: ${totalCalls}`);
  lines.push(`  Est. tokens: ~${Math.round(totalTokens / 1000)}k`);
  lines.push("");

  // Recent sessions
  lines.push("Recent sessions:");
  const recent = records.slice(-5).reverse();
  for (const r of recent) {
    const date = new Date(r.startedAt).toLocaleDateString();
    const time = new Date(r.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const dur = formatDuration(r.durationSec);
    const mode = r.mode !== "normal" ? ` [${r.mode}]` : "";
    lines.push(`  ${date} ${time} | ${dur} | ${r.toolCalls} calls | ${r.filesModified} files${mode} | ${r.outcome}`);
  }

  // Mode breakdown
  const modes = new Map<string, number>();
  for (const r of records) {
    modes.set(r.mode, (modes.get(r.mode) || 0) + 1);
  }
  if (modes.size > 1) {
    lines.push("");
    lines.push("Mode usage:");
    for (const [mode, count] of [...modes.entries()].sort((a, b) => b[1] - a[1])) {
      lines.push(`  ${mode}: ${count} session(s)`);
    }
  }

  return lines.join("\n");
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}
