---
name: deepsearch
description: Multi-strategy parallel codebase search. Combines text search, file patterns, git history, and import tracing to find code comprehensively.
user-invocable: true
allowed-tools: Read, Glob, Grep, Bash, Task
---

You have the deepsearch skill. When invoked, execute a multi-strategy search across the codebase.

## Usage
```
/not-my-reforge:deepsearch <query>
```

## Search Strategies

Execute these strategies in parallel using the Task tool:

### 1. Text Search (Grep)
- Search for the exact query string
- Search for variations: camelCase, snake_case, PascalCase, kebab-case
- Search with context (-C 3) for surrounding code

### 2. File Pattern Search (Glob)
- Find files whose names match the query
- Search related naming patterns (e.g., "auth" → `*auth*`, `*login*`, `*session*`)

### 3. Git History (Bash)
- `git log --all --oneline --grep="<query>"` — commits mentioning the query
- `git log --all --diff-filter=A -- "*<query>*"` — when files were added
- `git log -p -S "<query>" --all -- "*.ts" "*.js"` — pickaxe search for code changes

### 4. Import/Reference Tracing (Grep + Read)
- Find all files that import/require modules matching the query
- Trace the dependency chain: who uses what
- Check re-exports and barrel files

### 5. Symbol Definition Search (Grep)
- `function <query>`, `class <query>`, `interface <query>`, `type <query>`
- `const <query>`, `export .* <query>`
- Language-appropriate patterns based on detected tech stack

## Output Format
```markdown
## DeepSearch Results: "<query>"

### Definitions (N found)
- `file:line` — type/function/class definition

### Usage Sites (N found)
- `file:line` — how it's used (import, call, reference)

### Related Files (N found)
- `file` — related by name or content

### Git History (N commits)
- `hash` — commit message (date)

### Confidence
- High: exact match in definition
- Medium: usage/import reference
- Low: name similarity only
```

## Rules
- Launch strategies in parallel for speed
- Deduplicate results across strategies
- Sort by relevance: definitions → usages → references → history
- Cap at 20 results per strategy to avoid noise
- Show file:line format for easy navigation
- If no results, suggest alternative queries
