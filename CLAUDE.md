# not-my-reforge Development Rules

## Project Overview
Claude Code plugin — AI agent orchestration, quality hooks, smart routing, and team coordination.
Reforged from oh-my-opencode and oh-my-claudecode: same ideas, done right.

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
- Runtime data stored in `.reforge/` directory (gitignored)
- Exit code 0 = info/warning, exit code 2 = block action
- Keyword prefix: `reforge` (e.g., `reforge deep`, `reforge team 3`)
- Shortcut prefix: `#` (e.g., `#orch`, `#verify`, `#search`)

## Development
- Build: `npm run build`
- Test hooks: `echo '{"tool_name":"Write","tool_input":{"file_path":"/tmp/test.txt"}}' | node dist/hooks/write-guard.js`
- All paths in scripts should be relative to plugin root
