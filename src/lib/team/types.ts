export interface TeamState {
  active: boolean;
  sessionName: string;
  baseBranch: string;
  taskDescription: string;
  workers: WorkerInfo[];
  reviewer: WorkerInfo | null;
  stage: TeamStage;
  createdAt: string;
  lastUpdatedAt: string;
}

export type TeamStage = "planning" | "executing" | "reviewing" | "merging" | "done" | "aborted";

export interface WorkerInfo {
  id: number;
  name: string;
  branch: string;
  worktreePath: string;
  status: "pending" | "working" | "done" | "failed";
  taskDescription: string;
  modifiedFiles: string[];
  completedAt: string | null;
}

export interface MergeResult {
  branch: string;
  success: boolean;
  conflictFiles: string[];
}

export interface TeamReport {
  sessionName: string;
  stage: TeamStage;
  workers: {
    total: number;
    done: number;
    failed: number;
    pending: number;
  };
  mergeResults: MergeResult[];
  fileOverlaps: FileOverlap[];
}

export interface FileOverlap {
  file: string;
  workers: number[];
}

export function createTeamState(
  sessionName: string,
  baseBranch: string,
  taskDescription: string,
  workerCount: number
): TeamState {
  const workers: WorkerInfo[] = [];
  const timestamp = Date.now();

  for (let i = 1; i <= workerCount; i++) {
    workers.push({
      id: i,
      name: `worker-${i}`,
      branch: `spawn/${sessionName}/${i}-${timestamp}`,
      worktreePath: `/tmp/claude-worktrees/${sessionName}/agent-${i}`,
      status: "pending",
      taskDescription: "",
      modifiedFiles: [],
      completedAt: null,
    });
  }

  return {
    active: true,
    sessionName,
    baseBranch,
    taskDescription,
    workers,
    reviewer: null,
    stage: "planning",
    createdAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
  };
}
