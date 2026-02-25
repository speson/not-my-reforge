// Model router types — complexity-based model selection

export type ModelTier = "haiku" | "sonnet" | "opus";

export interface RoutingSignal {
  wordCount: number;
  complexKeywords: number;
  simpleKeywords: number;
  fileCount: number;
  hasMultiStep: boolean;
  hasArchitectural: boolean;
}

export interface RoutingDecision {
  tier: ModelTier;
  confidence: "high" | "medium" | "low";
  signals: RoutingSignal;
  reason: string;
}

export const TIER_LABELS: Record<ModelTier, string> = {
  haiku: "Quick (haiku) — fast, lightweight",
  sonnet: "Standard (sonnet) — balanced",
  opus: "Deep (opus) — thorough analysis",
};

export const TIER_COSTS: Record<ModelTier, number> = {
  haiku: 1,
  sonnet: 3,
  opus: 15,
};
