# not-my-reforge Development Rules

## Project Overview
Claude Code plugin — AI agent orchestration, quality hooks, smart routing, and team coordination.
Reforged from oh-my-opencode and oh-my-claudecode: same ideas, done right.
This repo is structured as a **marketplace** with the plugin at `plugins/not-my-reforge/`.

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
- Build: `cd plugins/not-my-reforge && npm run build`
- Test hooks: `echo '{"tool_name":"Write","tool_input":{"file_path":"/tmp/test.txt"}}' | node plugins/not-my-reforge/dist/hooks/write-guard.js`
- All paths in hooks use `${CLAUDE_PLUGIN_ROOT}` (resolved by Claude Code)
- `commands/`, `agents/`, `skills/` directories are auto-discovered by Claude Code (no need to list in plugin.json)
