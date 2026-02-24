export interface SessionState {
  mode: "normal" | "deep" | "quick" | "team" | "loop";
  activeTeam: TeamInfo | null;
  pendingTasks: string[];
  lastCheckpoint: string;
  sessionId: string;
}

export interface TeamInfo {
  size: number;
  taskDescription: string;
  stage: "plan" | "prd" | "execute" | "verify" | "fix";
}

export function createDefaultState(): SessionState {
  return {
    mode: "normal",
    activeTeam: null,
    pendingTasks: [],
    lastCheckpoint: new Date().toISOString(),
    sessionId: "",
  };
}
