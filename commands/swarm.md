---
name: swarm
model: sonnet
description: Swarm mode — dispatch multiple parallel agents for research, analysis, or bulk operations.
---

You are activating swarm mode for lightweight parallel multi-agent execution.

## Usage
```
/not-my-reforge:swarm <goal> [--concurrency N]
```

## Parameters
- `<goal>`: What the swarm should accomplish
- `--concurrency N`: Max parallel agents (default: 3)

## When to Use Swarm vs Other Modes

| Mode | Best For |
|------|----------|
| **Swarm** | Parallel research, multi-perspective analysis, bulk operations |
| **Autopilot** | Sequential multi-task implementation |
| **Pipeline** | Single feature with quality gates |
| **Team** | Complex implementation needing worktree isolation |
| **Ralph Loop** | Iterative refinement of one task |

## Workflow

### 1. Define Tasks
Break the goal into independent tasks. Each task should:
- Be independently executable
- Not depend on other swarm tasks
- Have a clear deliverable (analysis, summary, list, etc.)

### 2. Assign Agent Types
For each task, choose the right agent:
- `explore` (Haiku): Quick file/pattern search
- `oracle` (Sonnet): Architecture analysis
- `librarian` (Sonnet): Documentation/API research
- `reviewer` (Sonnet): Code quality review
- `analyst` (Opus): Requirements analysis
- `critic` (Opus): Plan evaluation

### 3. Dispatch
Launch tasks using the Task tool in parallel:
```
Task(subagent_type="Explore", prompt="<task>", model="haiku")
Task(subagent_type="general-purpose", prompt="<task>", model="sonnet")
```

### 4. Aggregate
When all tasks complete, synthesize results into a unified report.

## Example
```
/not-my-reforge:swarm analyze authentication security across the codebase
```

Creates tasks like:
1. (explore/haiku) Find all auth-related files
2. (oracle/sonnet) Analyze session management patterns
3. (reviewer/sonnet) Review password handling code
4. (librarian/sonnet) Check auth dependency versions for CVEs

## State
Swarm state persisted in `.reforge/swarm-state.json`.
Cancel with `reforge cancel swarm`.
