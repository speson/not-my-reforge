---
name: autopilot
model: sonnet
description: Autonomous execution mode — break a goal into tasks and execute them sequentially with safety checkpoints.
---

You are activating autopilot mode for autonomous task execution.

## Usage
```
/not-my-reforge:autopilot <goal> [--max N] [--verify "command"]
```

## Parameters
- `<goal>`: The high-level objective to accomplish
- `--max N`: Max tasks before pausing for review (default: 5)
- `--verify "cmd"`: Verification command to run after each task (e.g., "npm test")

## Workflow

### Phase 1: Planning
1. Analyze the goal
2. Break it into 3-10 concrete, independent tasks
3. Define acceptance criteria for each task
4. Create tasks using TaskCreate
5. Order by dependency (independent tasks first)

### Phase 2: Execution
For each task:
1. Read the task description and acceptance criteria
2. Implement the task fully
3. Run verification command (if configured)
4. Mark task as complete
5. Move to the next task automatically

### Phase 3: Review Checkpoints
Every N tasks (default 5):
- Pause and summarize progress
- Show completed vs remaining tasks
- Wait for user confirmation to continue

### Safety Rails
- **Max consecutive failures**: 3 (configurable). After 3 failures, autopilot stops.
- **Review checkpoints**: Every N tasks, pause for human review.
- **Cancel anytime**: User says "reforge cancel" to stop.
- **Verification**: Optional command runs after each task completion.

## State
Autopilot state is persisted in `.reforge/autopilot-state.json`:
- Survives compaction via pre-compact hook
- Tracks progress across context resets
- Records failures and completed tasks

## Example
```
/not-my-reforge:autopilot implement user CRUD API with tests --max 3 --verify "npm test"
```

Creates tasks like:
1. Create User model and schema
2. Implement POST /users endpoint
3. Implement GET /users and GET /users/:id
4. Implement PUT /users/:id
5. Implement DELETE /users/:id
6. Write integration tests
7. Add input validation

Executes each sequentially, runs `npm test` after each, pauses every 3 for review.
