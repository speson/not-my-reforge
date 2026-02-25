---
name: handoff
description: Generate a session handoff document capturing current work state, progress, and context for the next session or developer.
model: sonnet
argument-hint: [optional: additional context to include]
---

Generate a handoff document that captures the current work state for session continuity.

## Step 1: Gather Context

1. **Git state**:
   ```bash
   git branch --show-current
   git log --oneline -10
   git diff --stat HEAD
   git diff --cached --stat
   git stash list
   ```

2. **Recent changes**: Read the most recently modified source files (top 5 by mtime)

3. **Open issues**: Check for TODOs/FIXMEs in changed files
   ```bash
   git diff --name-only HEAD | head -20
   ```
   Then grep for TODO/FIXME in those files.

4. **Test state**: Check if tests pass
   ```bash
   # Detect test runner and run
   ```

## Step 2: Generate Handoff

Write to `.claude/handoff.md`:

```markdown
# Session Handoff — [date] [time]

## Branch
`[current branch]` — [last commit message]

## What Was Done
- [Summary of changes based on recent commits and diff]

## Current State
- [x] [Completed items]
- [ ] [In-progress items]
- [ ] [Remaining items]

## Changed Files
[List of modified/added/deleted files with brief descriptions]

## Open Issues
- [TODOs/FIXMEs found in changed files]
- [Known issues or failing tests]

## Next Steps
1. [Most important next action]
2. [Second priority]
3. [Third priority]

## Context Notes
[Any additional context that would help the next session]
[Architecture decisions made, alternatives considered]
[External dependencies or blockers]
```

## Step 3: Confirm

After writing:
- Print the handoff summary to the user
- Remind: "This handoff will be auto-loaded on next session start via session-context hook"

$ARGUMENTS
