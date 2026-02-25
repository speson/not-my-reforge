// Model router — complexity-based automatic model tier selection

import type { ModelTier, RoutingSignal, RoutingDecision } from "./types.js";
import { TIER_LABELS } from "./types.js";

const COMPLEX_PATTERNS = [
  /\brefactor\b/i,
  /\bmigrat(e|ion)\b/i,
  /\barchitect(ure)?\b/i,
  /\bredesign\b/i,
  /\boptimiz(e|ation)\b/i,
  /\bperformance\b/i,
  /\bsecur(e|ity)\s+(audit|review|scan)\b/i,
  /\bscal(e|ability)\b/i,
  /\bintegrat(e|ion)\b/i,
  /\bmulti[- ]?(file|module|service|component)\b/i,
  /\bcross[- ]cutting\b/i,
  /\bfull[- ]stack\b/i,
  /\bsystem\s+design\b/i,
  /\bdeep\s+(dive|analysis)\b/i,
  /\bcomprehensive\b/i,
];

const SIMPLE_PATTERNS = [
  /\bfix\s+(typo|typos)\b/i,
  /\brename\b/i,
  /\bupdate\s+(version|dep)/i,
  /\badd\s+(import|export|log|comment)\b/i,
  /\bremove\s+(unused|dead)\b/i,
  /\bformat\b/i,
  /\bsimple\b/i,
  /\bquick\b/i,
  /\bsmall\b/i,
  /\btrivial\b/i,
  /\bone[- ]?liner\b/i,
  /\bminor\b/i,
];

const MULTI_STEP_PATTERNS = [
  /\bthen\b/i,
  /\bafter\s+that\b/i,
  /\bfirst\b.*\bthen\b/i,
  /\bstep\s+\d/i,
  /\b\d+\)\s+/,
  /\band\s+also\b/i,
];

const ARCH_PATTERNS = [
  /\bdesign\s+pattern\b/i,
  /\bAPI\s+design\b/i,
  /\bdata\s+model\b/i,
  /\bschema\s+design\b/i,
  /\bdatabase\s+(design|migration)\b/i,
  /\bmicroservice/i,
  /\bevent[- ]driven\b/i,
];

export function analyzeSignals(prompt: string): RoutingSignal {
  const words = prompt.split(/\s+/);
  return {
    wordCount: words.length,
    complexKeywords: COMPLEX_PATTERNS.filter((re) => re.test(prompt)).length,
    simpleKeywords: SIMPLE_PATTERNS.filter((re) => re.test(prompt)).length,
    fileCount: (prompt.match(/\b\w+\.(ts|js|py|rs|go|java|rb|cpp|tsx|jsx)\b/g) || []).length,
    hasMultiStep: MULTI_STEP_PATTERNS.some((re) => re.test(prompt)),
    hasArchitectural: ARCH_PATTERNS.some((re) => re.test(prompt)),
  };
}

export function selectModelTier(prompt: string): RoutingDecision {
  const signals = analyzeSignals(prompt);

  let score = 0;
  score += signals.complexKeywords * 2;
  score -= signals.simpleKeywords * 2;
  score += Math.min(3, signals.fileCount);
  score += signals.hasMultiStep ? 1 : 0;
  score += signals.hasArchitectural ? 2 : 0;
  score += signals.wordCount > 80 ? 1 : 0;
  score += signals.wordCount > 150 ? 1 : 0;

  let tier: ModelTier;
  let confidence: "high" | "medium" | "low";
  let reason: string;

  if (score >= 5) {
    tier = "opus";
    confidence = score >= 7 ? "high" : "medium";
    reason = "High complexity detected — architectural/multi-file changes";
  } else if (score <= -3) {
    tier = "haiku";
    confidence = score <= -5 ? "high" : "medium";
    reason = "Simple task — quick fix or minor change";
  } else {
    tier = "sonnet";
    confidence = Math.abs(score) <= 1 ? "high" : "low";
    reason = "Moderate complexity — standard implementation";
  }

  return { tier, confidence, signals, reason };
}

export function formatRoutingAdvice(decision: RoutingDecision): string {
  const label = TIER_LABELS[decision.tier];
  const parts = [
    `[Model Routing] Recommended: ${label}`,
    `Reason: ${decision.reason}`,
    `Confidence: ${decision.confidence}`,
  ];

  if (decision.tier === "opus") {
    parts.push("Use `reforge deep <task>` to explicitly activate deep mode.");
  } else if (decision.tier === "haiku") {
    parts.push("Use `reforge quick <task>` to explicitly activate quick mode.");
  }

  return parts.join("\n");
}
