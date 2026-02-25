---
name: spawn
description: Decompose a complex task into parallel subtasks and generate tmux commands for concurrent execution with separate worktrees.
model: opus
argument-hint: <task description>
---

Decompose the given task into independent subtasks that can run in parallel, then generate the tmux execution commands.

## Step 1: Analyze the Task

Read the codebase to understand:
1. Project structure and module boundaries
2. File dependencies — which files import from which
3. Test structure and coverage

## Step 2: Decompose into Parallel Subtasks

Break $ARGUMENTS into independent, non-overlapping subtasks:

Rules for decomposition:
- Each subtask must modify **different files** (no overlap)
- Each subtask must be self-contained and independently verifiable
- Maximum 5 subtasks (more leads to merge complexity)
- Each subtask needs a clear, specific prompt

## Step 3: Generate Execution Plan

Output the decomposition:

```
## Task Decomposition

### Original Task
$ARGUMENTS

### Subtasks

#### 1. [Subtask Name]
- **Files**: [list of files this subtask will modify]
- **Prompt**: "[specific prompt for this subtask]"
- **Verification**: [how to verify this subtask succeeded]

#### 2. [Subtask Name]
...

### Dependency Graph
[Which subtasks are truly independent vs. which have ordering constraints]
```

## Step 4: Generate tmux Commands

Provide ready-to-run commands:

```bash
# Option A: Simple tmux (shared worktree — for non-overlapping file changes)
bash /path/to/plugin/scripts/tmux-spawn.sh "session-name" \
  "subtask 1 prompt" \
  "subtask 2 prompt" \
  "subtask 3 prompt"

# Option B: Worktree isolation (safest — each agent gets its own worktree)
bash /path/to/plugin/scripts/tmux-spawn-worktree.sh "session-name" \
  "subtask 1 prompt" \
  "subtask 2 prompt" \
  "subtask 3 prompt"
```

## Step 5: Merge Strategy

After all subtasks complete:
```
### Merge Order
1. [which subtask to merge first and why]
2. [second merge]
...

### Potential Conflicts
- [file X might conflict between subtask A and B — resolution strategy]
```

## Safety Notes
- Always prefer Option B (worktree) for overlapping concerns
- Rate limits: Claude API has concurrent request limits — 3 agents is usually safe
- Review each subtask's changes before merging
- Run full test suite after final merge

$ARGUMENTS
