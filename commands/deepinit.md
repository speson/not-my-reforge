---
name: deepinit
model: sonnet
description: Deep project initialization — generate hierarchical AGENTS.md, CLAUDE.md, and directory-level documentation.
---

You are performing a deep project initialization. This goes beyond basic CLAUDE.md generation by creating hierarchical, context-aware documentation.

## Process

### 1. Full Project Scan
Analyze the entire project structure:
- Read `package.json`, `tsconfig.json`, `Cargo.toml`, `pyproject.toml`, etc.
- Map the directory hierarchy and identify module boundaries
- Detect frameworks, libraries, and tools in use
- Identify test infrastructure and CI/CD setup

### 2. Generate Root CLAUDE.md
If not exists or user requests refresh:
- Project overview and architecture
- Key conventions (naming, imports, file organization)
- Build/test/lint commands
- Development workflow
- Common patterns used in the codebase

### 3. Generate Directory-Level Documentation
For each significant directory (src/, lib/, components/, api/, etc.):
- Create or update an `AGENTS.md` file describing:
  - Purpose of this directory
  - Key files and their roles
  - Internal conventions specific to this directory
  - Dependencies and interfaces with other directories
  - Testing patterns for this area

### 4. Identify Hot Paths
Analyze git history to find:
- Most frequently modified files
- Files with the most contributors
- Recent areas of activity
- Potential areas of concern (high churn + low test coverage)

### 5. Generate .reforge/project-memory.json
Update or create the project memory with detected:
- Tech stack details
- Build commands
- Code conventions
- Architectural patterns

## Output Structure

```
project/
├── CLAUDE.md              # Root — project-wide rules
├── src/
│   ├── AGENTS.md          # Source directory overview
│   ├── components/
│   │   └── AGENTS.md      # Component patterns
│   ├── api/
│   │   └── AGENTS.md      # API conventions
│   └── lib/
│       └── AGENTS.md      # Library utilities
└── tests/
    └── AGENTS.md          # Testing patterns
```

## Rules
- Only create AGENTS.md in directories with 3+ files
- Don't duplicate information between root CLAUDE.md and directory AGENTS.md
- Keep each AGENTS.md focused and concise (< 50 lines)
- Prefer updating existing documentation over creating new files
- Include file_path:line_number references where helpful
