---
name: safe-experiment
description: Experiment with code changes in an isolated worktree. Changes can be reviewed and merged or discarded.
user-invocable: true
allowed-tools: Read, Glob, Grep, Bash, Write, Edit, Task
---

You have the safe-experiment skill. When invoked, create an isolated worktree for experimental code changes.

## Usage
```
/not-my-reforge:safe-experiment <description of experiment>
```

## Protocol

### Phase 1 — Setup Isolation
1. Ensure the current working tree is clean (commit or stash pending changes)
2. Create a new worktree:
   ```bash
   git worktree add -b experiment/<timestamp> .claude/worktrees/experiment-<timestamp> HEAD
   ```
3. Switch to the worktree directory for all subsequent operations

### Phase 2 — Experiment
1. Implement the requested changes in the worktree
2. Run build/test/lint to verify the changes work
3. Document what was changed and why

### Phase 3 — Review
Present results to the user:
```markdown
## Experiment Results

### Changes Made
- file1.ts: description of change
- file2.ts: description of change

### Verification
- Build: PASS/FAIL
- Tests: PASS/FAIL (N tests)
- Lint: PASS/FAIL

### Diff Summary
(show `git diff --stat` from the worktree)
```

### Phase 4 — Decision
Ask the user:
- **Merge**: Cherry-pick or merge changes back to the main branch
- **Discard**: Remove the worktree and branch cleanly

## Merge Commands (if approved)
```bash
cd <original-cwd>
git merge experiment/<timestamp>
git worktree remove .claude/worktrees/experiment-<timestamp>
git branch -d experiment/<timestamp>
```

## Discard Commands
```bash
git worktree remove .claude/worktrees/experiment-<timestamp> --force
git branch -D experiment/<timestamp>
```

## Rules
- NEVER modify files in the main working tree
- ALL changes happen in the worktree
- Always verify with build/test before presenting results
- Clean up worktree after merge or discard
- If the experiment fails, explain why and suggest alternatives
