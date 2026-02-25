// Orchestration router types — smart mode selection for #orch

export type OrchMode = "ralph" | "autopilot" | "pipeline" | "team" | "swarm" | "qa" | "ralplan";

export interface TaskSignals {
  tasks: string[];
  taskCount: number;
  isMultiTask: boolean;
  isIterativeFix: boolean;
  isTestRelated: boolean;
  isResearch: boolean;
  isPlanning: boolean;
  isQualityCritical: boolean;
  hasVerifyCmd: boolean;
  verifyCmd: string | null;
}

export interface OrchRecommendation {
  mode: OrchMode;
  confidence: number;
  reason: string;
  workerCount?: number;
  tasks: string[];
}
