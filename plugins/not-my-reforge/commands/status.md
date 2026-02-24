---
name: status
model: haiku
description: Display session metrics dashboard — tool calls, context usage, active modes, and notification status.
---

You are displaying the not-my-reforge session status dashboard. Read and present the following data:

## Data Sources
Read these files from the `.reforge/` directory in the current project:

1. **`.reforge/session-metrics.json`** — Session metrics (tool calls, duration, agents, tokens)
2. **`.reforge/ralph-state.json`** — Ralph Loop state (if active)
3. **`.reforge/team-state.json`** — Team state (if active)
4. **`.reforge/notify-config.json`** — Notification config
5. **`.reforge/circuit-breaker.json`** — Failure tracking
6. **`.reforge/project-memory.json`** — Project memory

## Display Format

Present as a compact dashboard:

```
=== not-my-reforge Status ===

Session: 15m 32s | 87 tool calls (95% success) | ~12k tokens
Files modified: 8 | Agents spawned: 3

Active Modes:
  [Ralph Loop] iteration 3/10 — "implement auth module"
  [Team] session-abc — executing (2/3 workers done)

Top Tools:
  Edit: 24 | Read: 21 | Bash: 18 | Grep: 12 | Write: 8

Notifications: enabled
  [ON] discord-team (Discord)
  [ON] my-telegram (Telegram)

Circuit Breaker: 1 active (Edit: 2 consecutive failures)

Project: my-app (TypeScript, React, Next.js)
```

## Rules
- Only show sections that have data
- Keep output compact and scannable
- Use exact numbers, not approximations
- If no `.reforge/` directory exists, say "No session data found. Run a session first."
