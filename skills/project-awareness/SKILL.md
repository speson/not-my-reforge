---
name: project-awareness
description: Automatically detect and understand project structure, tech stack, conventions, and key files. Provides project context as background knowledge.
user-invocable: false
disable-model-invocation: false
allowed-tools: Read, Glob, Grep
---

You have the project-awareness skill. When starting work on a project, automatically gather the following context before proceeding with any task.

## Auto-Detection Checklist

### 1. Project Type
Check for these files to determine the tech stack:
- `package.json` → Node.js (check for framework: next, remix, vite, etc.)
- `tsconfig.json` → TypeScript
- `Cargo.toml` → Rust
- `go.mod` → Go
- `pyproject.toml` / `setup.py` / `requirements.txt` → Python
- `Gemfile` → Ruby
- `pubspec.yaml` → Flutter/Dart
- `pom.xml` / `build.gradle` → Java/Kotlin

### 2. Key Commands
Extract from package.json scripts, Makefile, or similar:
- **Dev**: `npm run dev`, `cargo run`, `go run .`
- **Build**: `npm run build`, `cargo build`, `go build`
- **Test**: `npm test`, `cargo test`, `go test ./...`
- **Lint**: `npm run lint`, `cargo clippy`

### 3. Directory Conventions
Map the source code layout:
- `src/` vs `app/` vs `lib/` — where does code live?
- `components/` — UI components
- `api/` or `routes/` — API endpoints
- `utils/` or `helpers/` — shared utilities
- `types/` or `interfaces/` — type definitions
- `__tests__/` or `tests/` — test files

### 4. Patterns to Follow
Detect from existing code:
- Naming: camelCase vs snake_case vs kebab-case
- Exports: named vs default
- Imports: relative vs aliases (@/)
- Error handling: try-catch vs Result types
- State management: which library/pattern

## Usage
This skill is automatically invoked as background knowledge. You don't need to run all checks every time — use judgment about which context is relevant to the current task. Prioritize reading:
1. The file(s) most relevant to the current task
2. Configuration files that affect the task
3. Related test files
