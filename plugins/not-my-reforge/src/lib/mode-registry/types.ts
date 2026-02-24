// Mode registry types — central mode state management

export type ModeName = "ralph" | "autopilot" | "pipeline" | "team" | "swarm" | "qa" | "ralplan";

export interface ActiveMode {
  name: ModeName;
  activatedAt: number;
  goal?: string;
}

export interface ModeRegistry {
  activeMode: ActiveMode | null;
  cancelSentinel: CancelSentinel | null;
  history: ModeHistoryEntry[];
}

export interface CancelSentinel {
  cancelledMode: ModeName;
  cancelledAt: number;
  ttlMs: number; // default 30000 (30s)
}

export interface ModeHistoryEntry {
  name: ModeName;
  activatedAt: number;
  deactivatedAt: number;
  outcome: "completed" | "cancelled" | "aborted" | "error";
}

// Modes that cannot run simultaneously
export const MODE_CONFLICTS: Record<ModeName, ModeName[]> = {
  ralph: ["autopilot", "pipeline", "qa", "ralplan"],
  autopilot: ["ralph", "pipeline", "qa", "ralplan"],
  pipeline: ["ralph", "autopilot", "qa", "ralplan"],
  team: [], // team can coexist with orchestration modes
  swarm: [], // swarm can coexist with orchestration modes
  qa: ["ralph", "autopilot", "pipeline", "ralplan"],
  ralplan: ["ralph", "autopilot", "pipeline", "qa"],
};

export const CANCEL_TTL_MS = 30_000; // 30 seconds

export const EMPTY_REGISTRY: ModeRegistry = {
  activeMode: null,
  cancelSentinel: null,
  history: [],
};
