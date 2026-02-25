---
name: mode
model: haiku
description: Mode management — show active mode, mode history, and manage mode state.
---

You are managing the reforge mode registry. Show the current mode status and history.

## Process

### 1. Read Mode State
- Read `.reforge/mode-registry.json` for current mode state
- Check for active mode, cancel cooldowns, and history

### 2. Display Status
```markdown
## Mode Status

**Active Mode**: <name> or "Normal (no active mode)"
**Duration**: <time since activation>
**Goal**: <if set>

### Cancel Cooldown
<if any mode is in cooldown, show remaining time>

### Recent History (last 5)
| Mode | Outcome | Duration |
|------|---------|----------|
```

### 3. Available Modes
List all available modes:
- `reforge loop <task>` — Ralph Loop (iterative refinement)
- `reforge autopilot <goal>` — Autopilot (autonomous multi-task)
- `reforge pipeline <goal>` — Pipeline (5-stage quality gates)
- `reforge team N <task>` — Team (parallel workers + reviewer)
- `reforge swarm <goal>` — Swarm (parallel research/analysis)
- `reforge qa <target>` — QA Loop (auto test-fix cycle)
- `reforge ralplan <goal>` — Ralplan (consensus planning)

## Rules
- Always read the actual state file, don't guess
- Show cancel cooldown if active
- Include mode conflict information if relevant
