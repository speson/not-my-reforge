---
name: ultrawork
model: sonnet
description: Ultrawork — activate ALL available specialized agents in maximum parallel execution for comprehensive task coverage.
argument-hint: <task description>
---

You are activating Ultrawork mode — maximum parallel agent execution.

## Usage
```
/not-my-reforge:ultrawork <task description>
reforge ultrawork <task description>
#ultrawork <task description>
#uw <task description>
```

## What Ultrawork Does

Ultrawork decomposes your task and dispatches ALL available specialized agents in parallel using the Task tool with `run_in_background: true`. Every angle is covered simultaneously for maximum throughput.

## Agent Roster

| Agent | Specialty | Model |
|-------|-----------|-------|
| oracle-deep | Deep analysis, architecture decisions | opus |
| analyst | Requirements decomposition, acceptance criteria | opus |
| critic | Plan evaluation, risk detection | opus |
| security-reviewer | OWASP Top 10, secrets, auth, CVEs | opus |
| planner | Implementation roadmap | sonnet |
| build-fixer | Compilation errors, type errors, dependency issues | sonnet |
| test-engineer | Test writing, coverage, test strategy | sonnet |
| reviewer | Code quality, conventions, correctness | sonnet |
| qa-engineer | Test-fix-retest cycles, regression detection | sonnet |
| designer | UI/UX, component structure, visual design | sonnet |
| deepsearch | Cross-codebase search and discovery | sonnet |
| explore | Codebase exploration, context gathering | sonnet |

## Execution Protocol

### Phase 1 — Decompose (you do this first)
Analyze the task and identify which agent types are relevant. Not every agent needs to run — pick the ones that matter for this specific task.

### Phase 2 — Parallel Dispatch
Launch all selected agents simultaneously using the Task tool:

```
Task tool calls (ALL in one message, run_in_background: true):
- oracle-deep:   "Analyze architecture implications of: <task>"
- security-reviewer: "Audit security considerations for: <task>"
- test-engineer: "Design test strategy for: <task>"
- build-fixer:   "Identify build/compilation risks for: <task>"
- designer:      "Design UI/component structure for: <task>"  (if UI involved)
- analyst:       "Decompose requirements for: <task>"
```

### Phase 3 — Implement
While agents run, begin core implementation based on available context.

### Phase 4 — Aggregate Results
After all agents complete:
1. Collect all agent outputs
2. Merge findings (resolve conflicts, prioritize by severity)
3. Apply agent recommendations to implementation
4. Fix any security/quality issues surfaced

### Phase 5 — Full Verification
Run all checks before concluding:
```
npm run build --if-present
npm test --if-present
npm run lint --if-present
npx tsc --noEmit (if TypeScript)
```

## Signal Protocol
- `[UW:DISPATCHED]` — all agents launched
- `[UW:AGGREGATING]` — collecting agent results
- `[UW:VERIFIED]` — all checks pass
- `[UW:DONE]` — ultrawork complete

## Final Report Format
```
## Ultrawork Complete
- Task: <description>
- Agents dispatched: N
- Findings: <critical issues found and fixed>
- Build: PASS/FAIL
- Tests: PASS/FAIL
- Lint: PASS/FAIL
- Files modified: <list>
```

## When to Use Ultrawork
- Large-scope features touching multiple system layers
- Tasks with unknown blast radius
- When you need maximum confidence in correctness and safety
- Complex refactors requiring analysis + implementation + verification simultaneously

$ARGUMENTS
