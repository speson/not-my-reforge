---
name: history
model: haiku
description: View session history — past sessions, duration, tool usage, and trends.
---

You are displaying the not-my-reforge session history. Read and present data from `.reforge/session-history.json`.

## Data Source
Read `.reforge/session-history.json` from the current project directory.

## Display Format

Present as a summary dashboard:

```
=== Session History ===

Totals:
  Sessions: 23
  Total time: 14h 32m
  Avg session: 38m
  Tool calls: 1,247
  Est. tokens: ~580k

Recent sessions:
  2025-01-15 14:30 | 45m | 87 calls | 12 files [autopilot] | completed
  2025-01-15 10:15 | 22m | 34 calls |  3 files [normal]    | completed
  2025-01-14 16:00 | 1h  | 156 calls | 28 files [pipeline] | completed
  2025-01-14 11:30 | 15m | 21 calls |  2 files [ralph]     | aborted
  2025-01-13 09:00 | 35m | 64 calls |  8 files [team]      | completed

Mode usage:
  normal: 12 sessions
  autopilot: 5 sessions
  pipeline: 3 sessions
  ralph: 2 sessions
  team: 1 session
```

## Options
- Default: show last 10 sessions with summary
- `all`: show all sessions
- `stats`: show statistics only
- `<N>`: show last N sessions

## Rules
- If no history file exists, say "No session history found. History is recorded automatically after each session."
- Keep output compact and scannable
- Show exact numbers, not approximations
- Highlight any aborted sessions
