export interface LearnedPattern {
  type: "naming" | "import" | "structure" | "command" | "workflow";
  pattern: string;
  confidence: number; // 0-1, increases with repeated observation
  examples: string[];
  observedCount: number;
  lastSeen: string;
}

export interface LearnedPatterns {
  patterns: LearnedPattern[];
  lastUpdated: string;
}

export function createEmptyPatterns(): LearnedPatterns {
  return {
    patterns: [],
    lastUpdated: new Date().toISOString(),
  };
}
