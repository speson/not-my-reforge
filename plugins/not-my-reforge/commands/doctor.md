---
name: doctor
model: haiku
description: Diagnose plugin health — check dependencies, hooks, agents, and runtime state.
---

You are running the not-my-reforge diagnostic check. Verify the plugin is properly installed and functioning.

## Checks

### 1. Node.js Runtime
- Run: `node --version`
- Requirement: >= 18.0.0
- If missing: warn that hooks will use bash fallback

### 2. Compiled Hooks
- Check if `dist/hooks/` directory exists and has .js files
- Compare `src/hooks/*.ts` count vs `dist/hooks/*.js` count
- If mismatch: suggest `npm run build`

### 3. Plugin Registration
- Read `.claude-plugin/plugin.json`
- Verify version, commands path, agents path, hooks path
- Check that referenced directories exist

### 4. Hooks Configuration
- Read `hooks/hooks.json`
- Count registered hooks per event
- Verify all referenced .js files exist in `dist/hooks/`

### 5. Agents & Commands
- Count agent files in `agents/` and `agents/teams/`
- Count command files in `commands/`
- Verify all have valid YAML frontmatter

### 6. Runtime State (.reforge/)
- Check if `.reforge/` directory exists
- List active state files (ralph, autopilot, pipeline, team)
- Check for stale state (active but old timestamps)
- Report disk usage of `.reforge/`

### 7. Git Integration
- Verify inside a git repository
- Check for `.reforge/` in `.gitignore`

### 8. Dependencies
- Check `node_modules/` exists
- Verify TypeScript is installed

## Output Format

```
=== not-my-reforge Doctor ===

[OK] Node.js: v22.0.0
[OK] Compiled hooks: 32/32
[OK] Plugin registered: v1.6.0
[OK] Hooks config: 38 hooks across 8 events
[OK] Agents: 21 (16 base + 5 team)
[OK] Commands: 16
[OK] Runtime state: .reforge/ exists, 3 state files
[OK] Git: inside repo, .reforge/ in .gitignore
[OK] Dependencies: node_modules present

Status: All checks passed!
```

Use `[OK]`, `[WARN]`, or `[FAIL]` prefix for each check.
