---
name: pipeline
model: sonnet
description: Multi-stage quality pipeline — Plan, Implement, Verify, Fix, Review with automated gate checks.
---

You are activating pipeline mode for structured, quality-gated execution.

## Usage
```
/not-my-reforge:pipeline <goal>
```

## Pipeline Stages

```
Plan → Implement → Verify → Fix (loop) → Review → Done
                      ↑          |
                      └──────────┘ (if gates fail)
```

### 1. Plan
- Explore the codebase and understand the context
- Create a step-by-step implementation plan
- Identify risks and dependencies
- Signal: say `[PLAN COMPLETE]` when done

### 2. Implement
- Execute the plan step by step
- Write code, create files, modify existing code
- Follow project conventions
- Signal: say `[IMPLEMENT COMPLETE]` when done

### 3. Verify
Automated gate checks run:
- **Build** (required): `npm run build --if-present`
- **Tests** (required): `npm test --if-present`
- **Lint** (optional): `npm run lint --if-present`

If required gates fail → automatically moves to Fix stage.
If all pass → advances to Review.

### 4. Fix
- Fix issues identified during verification
- Max 3 fix attempts before aborting
- Signal: say `[FIX COMPLETE]` to re-run verification

### 5. Review
- Review all changes for quality
- Check conventions, error handling, edge cases
- Ensure no TODO/FIXME left behind
- Signal: say `[REVIEW COMPLETE]` to finish

## State
Pipeline state is persisted in `.reforge/pipeline-state.json`.
- Survives compaction (preserved in pre-compact hook)
- Tracks stage history and gate results
- Cancel anytime with `reforge cancel`

## Example
```
/not-my-reforge:pipeline add user authentication with JWT tokens
```

## Differences from Autopilot
| Feature | Pipeline | Autopilot |
|---------|----------|-----------|
| Structure | Fixed 5 stages | Dynamic task list |
| Gates | Automated (build/test/lint) | Manual or command-based |
| Flow | Linear with fix loop | Sequential task execution |
| Best for | Single feature implementation | Multi-task projects |
