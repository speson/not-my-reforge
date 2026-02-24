---
name: loop
description: Ralph Loop — persistent iterative execution with automatic verification, failure adaptation, and completion detection. Keeps running until the task passes all checks or max iterations are reached.
model: sonnet
argument-hint: <task description> [--max N] [--verify "command"]
---

Execute the given task in a persistent Ralph Loop. The loop automatically blocks session stop until the task is verified complete, adapts strategy on failure, and survives context compaction.

## How It Works

The Ralph Loop is managed by three hooks:
1. **ralph-init** (UserPromptSubmit): Initializes `.reforge/ralph-state.json` with task, max iterations, and verify command
2. **ralph-continuation** (Stop): Blocks stop if task is incomplete, advances iteration, injects adaptation strategy
3. **ralph-compact** (PreCompact): Preserves loop state through context compaction

## Configuration
- **Max iterations**: 20 (override with `--max N`)
- **Verification**: Automatic (build + test + lint) or explicit (`--verify "npm test"`)

## Execution Protocol

### Starting the Loop
The loop starts automatically when you use this command. State is persisted in `.reforge/ralph-state.json`.

### Each Iteration
1. **Execute**: Implement the task (write code, fix bugs, modify files)
2. **Verify**: Run verification
   - If `--verify` provided: run that specific command
   - Otherwise: run build, test, and lint
3. **Evaluate**:
   - **PASS**: Signal `[RALPH:DONE]` → loop ends, session can stop
   - **FAIL**: Loop blocks stop, advances iteration, injects new strategy

### Adaptation Strategy (automatic)
- **Iteration 1-3**: Straightforward approach — try the obvious fix
- **Iteration 4-7**: Reassess — re-read files, challenge assumptions, try different approach
- **Iteration 8-12**: Lateral thinking — check git history, search for working patterns, consider workarounds
- **Iteration 13+**: Minimum viable — find the simplest possible change that works
- **5+ consecutive failures**: Escalation — stop current approach entirely, ask for guidance

### Completion Signals
- Include `[RALPH:DONE]` in your message when the task is verified complete
- Or: all verification checks (build/test/lint) pass automatically

### Cancelling
- Say `reforge ralph-cancel` to abort the loop at any time

## Output Per Iteration
```
--- Iteration N/max ---
Action: [what was done]
Result: [PASS/FAIL]
[If FAIL: reason and next approach]
```

## Final Report
```
## Ralph Loop Complete
- Task: [description]
- Iterations: N/max
- Result: SUCCESS / FAILED / ABORTED
- Changes made: [list of files modified]
- Verification: [final results]
```

## Safety Rails
- Loop auto-terminates at max iterations (default 20)
- 5 consecutive identical failures trigger escalation to user
- State survives context compaction (PreCompact hook)
- Cancel anytime with `reforge ralph-cancel`

$ARGUMENTS
