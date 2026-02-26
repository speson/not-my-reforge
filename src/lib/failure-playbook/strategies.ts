// Failure Playbook — error-type-specific recovery strategies
// Pure functions: no file I/O, just pattern matching and string generation

export interface RecoveryStrategy {
  errorType: string;
  suggestion: string;
  commands: string[];
}

interface ErrorPattern {
  errorType: string;
  patterns: RegExp[];
  suggestion: string;
  commands: string[];
}

const ERROR_PATTERNS: ErrorPattern[] = [
  {
    errorType: "TypeScript error",
    patterns: [
      /error TS\d+/,
      /Cannot find/,
      /Type '.*' is not assignable/,
    ],
    suggestion:
      "Read the type definition to understand the expected types. Check the error code for the specific constraint being violated.",
    commands: [
      "npx tsc --noEmit 2>&1 | head -20",
      "grep -r 'type\\|interface' src/lib/types.ts",
    ],
  },
  {
    errorType: "Test failure",
    patterns: [
      /\bFAIL\b/,
      /AssertionError/,
      /Expected .* Received/,
      /test failed/i,
    ],
    suggestion:
      "Run the single failing test in isolation to get a cleaner error message. Read the test file to understand the expected behavior.",
    commands: [
      "npx jest --testPathPattern='<failing-test-file>' --no-coverage 2>&1 | tail -30",
      "npx vitest run <failing-test-file> 2>&1 | tail -30",
    ],
  },
  {
    errorType: "Build error",
    patterns: [
      /Module not found/,
      /Cannot resolve/,
      /compilation failed/i,
    ],
    suggestion:
      "Check that all imports resolve correctly. Verify the dependency is installed and the path is accurate.",
    commands: [
      "npm ls 2>&1 | grep -E 'missing|invalid|UNMET'",
      "npm install 2>&1 | tail -10",
    ],
  },
  {
    errorType: "Permission error",
    patterns: [
      /EACCES/,
      /Permission denied/,
    ],
    suggestion:
      "Check file and directory permissions. Ensure the process is running as the correct user.",
    commands: [
      "ls -la <target-path>",
      "whoami",
    ],
  },
  {
    errorType: "Syntax error",
    patterns: [
      /SyntaxError/,
      /Unexpected token/,
    ],
    suggestion:
      "Check for missing or mismatched brackets, commas, or semicolons near the reported error line.",
    commands: [
      "node --check <file> 2>&1",
      "npx tsc --noEmit 2>&1 | head -10",
    ],
  },
];

export function getRecoveryStrategy(
  _toolName: string,
  errorContent: string
): RecoveryStrategy | null {
  for (const entry of ERROR_PATTERNS) {
    const matched = entry.patterns.some((pattern) => pattern.test(errorContent));
    if (matched) {
      return {
        errorType: entry.errorType,
        suggestion: entry.suggestion,
        commands: entry.commands,
      };
    }
  }
  return null;
}
