// Query learned patterns for context injection

import { loadPatterns } from "./pattern-extractor.js";
import type { LearnedPattern } from "./types.js";

export function getHighConfidencePatterns(
  cwd: string,
  minConfidence: number = 0.3
): LearnedPattern[] {
  const data = loadPatterns(cwd);
  return data.patterns
    .filter((p) => p.confidence >= minConfidence)
    .sort((a, b) => b.confidence - a.confidence);
}

export function getPatternsByType(
  cwd: string,
  type: LearnedPattern["type"],
  minConfidence: number = 0.2
): LearnedPattern[] {
  const data = loadPatterns(cwd);
  return data.patterns
    .filter((p) => p.type === type && p.confidence >= minConfidence)
    .sort((a, b) => b.confidence - a.confidence);
}

export function getDominantPattern(
  cwd: string,
  type: LearnedPattern["type"]
): LearnedPattern | null {
  const patterns = getPatternsByType(cwd, type);
  return patterns.length > 0 ? patterns[0] : null;
}

export function formatLearnedContext(cwd: string): string | null {
  const highConf = getHighConfidencePatterns(cwd, 0.4);
  if (highConf.length === 0) return null;

  const grouped: Record<string, LearnedPattern[]> = {};
  for (const p of highConf) {
    if (!grouped[p.type]) grouped[p.type] = [];
    grouped[p.type].push(p);
  }

  const lines: string[] = ["[Learned Project Conventions]"];

  if (grouped.naming) {
    const dominant = grouped.naming[0];
    lines.push(`Naming: ${dominant.pattern} (${Math.round(dominant.confidence * 100)}% confidence, ${dominant.observedCount} observations)`);
  }

  if (grouped.import) {
    const dominant = grouped.import[0];
    lines.push(`Imports: ${dominant.pattern} (${Math.round(dominant.confidence * 100)}% confidence)`);
  }

  if (grouped.command) {
    const cmds = grouped.command.slice(0, 3).map((p) => p.pattern);
    lines.push(`Build commands: ${cmds.join(", ")}`);
  }

  if (grouped.workflow) {
    const flows = grouped.workflow.slice(0, 3).map((p) => p.pattern);
    lines.push(`Workflows: ${flows.join(", ")}`);
  }

  if (grouped.structure) {
    const structs = grouped.structure.slice(0, 3).map((p) => p.pattern);
    lines.push(`Structure: ${structs.join(", ")}`);
  }

  return lines.length > 1 ? lines.join("\n") : null;
}
