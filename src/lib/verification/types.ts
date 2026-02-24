export interface VerificationResult {
  check: "BUILD" | "TEST" | "LINT" | "TODO" | "ERROR_FREE";
  status: "pass" | "fail" | "skip";
  evidence?: string;
  timestamp?: number;
}

export interface VerificationReport {
  results: VerificationResult[];
  allPassed: boolean;
  summary: string;
}
