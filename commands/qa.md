---
name: qa
model: sonnet
description: Auto QA loop — run tests, analyze failures, fix, and retest automatically.
---

You are running an automated QA loop. Execute the test-fix cycle until all tests pass or max iterations reached.

## Process

### 1. Baseline
- Detect the test framework (jest, vitest, pytest, cargo test, go test, etc.)
- Run the full test suite
- Count: total, passing, failing, skipped

### 2. Fix Loop (max 3 iterations)
For each failing test:
1. Read the failing test and the code under test
2. Identify root cause
3. Apply the minimal fix
4. Re-run just that test to verify
5. Run full suite to check for regressions

### 3. Report
```markdown
## QA Report

### Summary
- Total: N tests
- Passing: N (before → after)
- Fixed: N tests across M files
- Remaining failures: N

### Fixes Applied
1. `file:line` — description of fix (root cause: ...)
2. ...

### Remaining Issues
- `test_name` — reason it couldn't be auto-fixed
```

## Rules
- Never delete tests to make them pass
- Never weaken assertions
- If a fix breaks other tests, revert it
- Prioritize: compilation errors → runtime errors → assertion failures
- Report honestly — don't claim success if tests still fail
