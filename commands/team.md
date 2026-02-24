---
name: team
model: sonnet
description: Create an Agent Teams setup with N workers + reviewer for parallel task execution with worktree isolation and merge coordination.
---

You are orchestrating an Agent Teams setup. Follow these steps:

## Prerequisites Check
First, verify that Agent Teams is available:
- Check if `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` is set
- If not set, inform the user: "Agent Teams requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` to be set. Add it to your environment and restart Claude Code."

## Team Setup
Parse the user's request for:
- **Team size** (N): Number of implementation workers
- **Task description**: What the team should accomplish

## Team Composition
Create tasks for the following team structure:
1. **Lead** (you): Decompose the task, create subtasks with acceptance criteria
2. **N Workers**: Each assigned to an independent subtask with worktree isolation
3. **1 Reviewer**: Reviews all worker output before integration

## Workflow
1. Analyze the task and break it into N independent subtasks
2. Create TaskCreate entries for each subtask with clear acceptance criteria
3. Assign tasks to workers — each worker gets one subtask
4. Workers execute in parallel in isolated worktrees
5. Reviewer validates each completed subtask
6. Lead integrates results and runs final verification

## Team State
The team state is persisted in `.reforge/team-state.json`. Key operations:
- **Create**: `createTeamState(sessionName, baseBranch, task, workerCount)` initializes state
- **Update**: Worker status auto-updates via `task-completed.ts` hook
- **Monitor**: Check `.reforge/team-state.json` for real-time progress
- **Merge**: When all workers are done, the `team-shutdown.ts` hook generates a merge report

## Merge Coordination
When all workers complete:
1. File overlap detection identifies potential conflicts
2. Merge order is suggested (fewest changes first)
3. Use the merge script for automated sequential merge:
   ```
   bash "${CLAUDE_PLUGIN_ROOT}/scripts/team-merge.sh" "<session-name>" "<base-branch>"
   ```
4. Or merge manually following the suggested order

## Cleanup
After successful merge:
```bash
git worktree prune
git branch -d spawn/<session>/*
```

## Example Usage
```
/not-my-reforge:team 3 implement user authentication with login, signup, and password reset
```

This creates:
- Worker 1: Login flow
- Worker 2: Signup flow
- Worker 3: Password reset flow
- Reviewer: Validates all three implementations

## Hooks Integration
- **TeammateIdle**: Checks for lint/type errors + pending tasks when a worker idles
- **TaskCompleted**: Records worker completion in team state, triggers merge readiness check
- **Stop**: Generates merge report when all workers are done
