# not-my-reforge Development Rules

## Project Overview
Claude Code plugin — AI agent orchestration, quality hooks, smart routing, and team coordination.
Reforged from oh-my-opencode and oh-my-claudecode: same ideas, done right.
This repo is a single Claude Code plugin at the root level.

## Architecture
- `agents/` — Markdown agent definitions (model, tools, system prompt)
- `commands/` — Slash command definitions (model, instructions)
- `hooks/` — Event-driven quality automation (TypeScript)
- `scripts/` — Supporting scripts (tmux, HUD, merge)
- `skills/` — Reusable skill definitions
- `src/` — TypeScript source (compiled to `dist/`)

## Conventions
- Agent/command files are Markdown with YAML frontmatter
- Hook scripts are TypeScript, compiled to JS, invoked via `scripts/find-node.sh`
- Runtime data stored in `.reforge/` directory (gitignored, at project cwd)
- Exit code 0 = info/warning, exit code 2 = block action
- Keyword prefix: `reforge` (e.g., `reforge deep`, `reforge team 3`)
- Shortcut prefix: `#` (e.g., `#orch`, `#verify`, `#search`)

## Development
- Build: `npm run build`
- Test hooks: `echo '{"tool_name":"Write","tool_input":{"file_path":"/tmp/test.txt"}}' | node dist/hooks/write-guard.js`
- All paths in hooks use `${CLAUDE_PLUGIN_ROOT}` (resolved by Claude Code)
- `commands/`, `agents/`, `skills/` directories are auto-discovered by Claude Code (no need to list in plugin.json)

## Critical: Hook Input Fields
- Claude Code UserPromptSubmit hooks receive `prompt` field (NOT `user_prompt`)
- Full input shape: `{ session_id, transcript_path, cwd, permission_mode, hook_event_name, prompt }`
- Package type is ESM (`"type": "module"`) — `require()` is NOT available, use `import`

---

## Last Session (2026-02-25)

### Completed
- [x] Fix all UserPromptSubmit hooks: `input.user_prompt` → `input.prompt` (21 files)
- [x] Fix tmux popup spawn: added `detached: true` + `child.unref()`
- [x] Update `UserPromptSubmitInput` type definition
- [x] Version bump to 2.1.4, pushed to main

### Next
- [ ] Verify other hook event types have correct input field names (PreToolUse, PostToolUse, etc.)
- [ ] Consider adding input shape validation for hooks to catch field mismatches early
