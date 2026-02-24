// Deliverable verification types

export interface AcceptanceCriterion {
  description: string;
  type: "file_exists" | "test_passes" | "build_succeeds" | "no_errors" | "custom";
  /** For file_exists: glob pattern. For test_passes/build_succeeds: command. For custom: command. */
  value: string;
}

export interface Deliverable {
  name: string;
  description: string;
  criteria: AcceptanceCriterion[];
}

export interface DeliverableResult {
  deliverable: string;
  criterion: string;
  passed: boolean;
  detail: string;
}

export interface DeliverableReport {
  deliverables: DeliverableResult[];
  allPassed: boolean;
  passCount: number;
  failCount: number;
  summary: string;
}
