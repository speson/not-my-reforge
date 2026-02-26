# not-my-reforge Development Rules

## Project Overview
Claude Code plugin (v2.4.0) — AI agent orchestration, quality hooks, smart routing, and team coordination.
Reforged from oh-my-opencode and oh-my-claudecode: same ideas, done right.
This repo is a single Claude Code plugin at the root level.

## Architecture
- `agents/` — 20 core + 5 team agent definitions (Markdown + YAML frontmatter)
- `commands/` — 24 slash command definitions (Markdown + YAML frontmatter)
- `hooks/` — Event-driven quality automation (hooks.json → TypeScript)
- `scripts/` — Supporting scripts (tmux, HUD, merge, find-node)
- `skills/` — 5 reusable skill definitions (project-awareness, deepsearch, team-pipeline, code-audit, safe-experiment)
- `src/hooks/` — Hook implementations (TypeScript, compiled to `dist/`)
- `src/lib/` — Shared libraries:
  - `circuit-breaker/` — Consecutive failure tracking + escalation
  - `failure-playbook/` — Error-type-specific recovery strategies
  - `file-ownership/` — File lock registry for team isolation
  - `metrics/` — Session metrics + context thresholds
  - `mode-registry/` — Orchestration mode state management
  - `notepad/` — Session-scoped notes (survives compaction)
  - `orchestration/` — Smart routing + mode selection
  - `quality/` — Quality Score tracking (edit/build/test/cleanness)
  - `ralph/` — Ralph Loop state management
  - `team/` — Team state for Agent Teams
  - `trust/` — Progressive Trust (level 0-3 auto-permission)
  - `yolo/` — Yolo mode settings
- `.mcp.json` — MCP servers (Context7, grep.app)

## Conventions
- Agent/command files are Markdown with YAML frontmatter
- Hook scripts are TypeScript, compiled to JS, invoked via `scripts/find-node.sh`
- Runtime data stored in `.reforge/` directory (gitignored, at project cwd)
- Exit code 0 = info/warning, exit code 2 = block action
- Keyword prefix: `reforge` (e.g., `reforge deep`, `reforge team 3`) — 11 keywords
- Shortcut prefix: `#` (e.g., `#orch`, `#verify`, `#search`) — 24 shortcuts
- Hook event types: SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, PermissionRequest, PreCompact, Stop, TeammateIdle, TaskCompleted

## Development
- Build: `npm run build`
- Test: `npm test` (63 tests across 4 suites)
- Test hooks: `echo '{"tool_name":"Write","tool_input":{"file_path":"/tmp/test.txt"}}' | node dist/hooks/write-guard.js`
- All paths in hooks use `${CLAUDE_PLUGIN_ROOT}` (resolved by Claude Code)
- `commands/`, `agents/`, `skills/` directories are auto-discovered by Claude Code (no need to list in plugin.json)

## Critical: Hook Input Fields
- Claude Code UserPromptSubmit hooks receive `prompt` field (NOT `user_prompt`)
- Full input shape: `{ session_id, transcript_path, cwd, permission_mode, hook_event_name, prompt }`
- Package type is ESM (`"type": "module"`) — `require()` is NOT available, use `import`
- hookEventName must match the actual event: `"UserPromptSubmit"`, `"PostToolUse"`, `"Stop"`, `"TeammateIdle"`, `"TaskCompleted"`, etc.
- Action item regex must be dynamically constructed to avoid self-matching:
  ```typescript
  const pattern = new RegExp(["TO","DO"].join("") + "|" + ["FIX","ME"].join(""));
  ```

## Key Systems

### Progressive Trust (src/lib/trust/)
Session-scoped permission escalation: L0 (strict) → L1 (Edit auto) → L2 (Write+build/test auto) → L3 (non-destructive Bash auto).
Tracked by `trust-tracker.ts` PostToolUse hook, enforced by `permission-bypass.ts`.

### Quality Score (src/lib/quality/)
Weighted composite: edit success 30%, build health 25%, test health 25%, code cleanness 20%.
View with `#score`.

### Failure Playbook (src/lib/failure-playbook/)
5 error types (TypeScript, test, build, permission, syntax) → recovery suggestions + commands.
Integrated into `failure-tracker.ts`.
