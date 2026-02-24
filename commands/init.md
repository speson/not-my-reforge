---
name: init
description: Auto-generate CLAUDE.md by analyzing project structure, dependencies, conventions, and patterns. Creates a comprehensive project instruction file.
model: sonnet
argument-hint: [optional: output path, default: CLAUDE.md]
---

Analyze this project and generate a comprehensive CLAUDE.md file.

## Step 1: Project Discovery

Scan the project structure:
1. **Root files**: `ls` the project root for config files
2. **Package manager**: Read package.json, Cargo.toml, go.mod, pyproject.toml, etc.
3. **Framework config**: Read tsconfig.json, next.config.*, vite.config.*, etc.
4. **Directory structure**: Glob for `**/` to understand the layout (top 3 levels)
5. **Existing CLAUDE.md**: Check if one exists — if so, read it to preserve user customizations

## Step 2: Pattern Analysis

Detect patterns by sampling files:
1. **Naming conventions**: Check 5+ source files for camelCase/snake_case/kebab-case
2. **Import style**: ESM vs CJS, path aliases, barrel exports
3. **Component patterns**: Function components, hooks, HOCs, composition
4. **Testing patterns**: Jest/Vitest/pytest, file naming (*test*, *spec*), location (co-located vs __tests__)
5. **Styling approach**: Tailwind, CSS modules, styled-components, etc.
6. **State management**: Redux, Zustand, Context, Vuex, Pinia, etc.
7. **API patterns**: REST, GraphQL, tRPC, route handlers
8. **Error handling**: Try-catch patterns, Result types, error boundaries

## Step 3: Generate CLAUDE.md

Write the output file (default: CLAUDE.md at project root, or $ARGUMENTS if specified).

### Template Structure:

```markdown
# [Project Name]

## Overview
[1-2 sentence project description based on README/package.json]

## Tech Stack
- **Runtime**: [Node.js/Deno/Bun] [version]
- **Framework**: [Next.js/Remix/etc.] [version]
- **Language**: [TypeScript/JavaScript/Python/etc.]
- **Styling**: [Tailwind/CSS Modules/etc.]
- **Database**: [if detected]
- **Testing**: [framework] — run with `[command]`

## Project Structure
[Key directories and their purposes]

## Conventions
- **Naming**: [detected convention]
- **Imports**: [detected style]
- **Components**: [detected pattern]
- **Tests**: [location and naming]

## Commands
- `[dev command]` — Start development server
- `[build command]` — Build for production
- `[test command]` — Run tests
- `[lint command]` — Run linter

## Rules
- [Key project-specific rules derived from configs]
- [e.g., "Use path aliases (@/) for imports"]
- [e.g., "All API routes must have input validation"]
```

## Step 4: Report

After writing, output:
- Summary of detected patterns
- Any patterns that couldn't be auto-detected (user should fill in)
- Suggestions for additional rules

$ARGUMENTS
