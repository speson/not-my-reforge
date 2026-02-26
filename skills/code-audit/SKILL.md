---
name: code-audit
description: Multi-perspective code audit. Launches parallel security, quality, performance, and architecture analysis agents.
user-invocable: true
allowed-tools: Read, Glob, Grep, Bash, Task
---

You have the code-audit skill. When invoked, run a comprehensive multi-perspective code audit.

## Usage
```
/not-my-reforge:code-audit [scope]
```

Scope can be: a file path, directory, or "all" for full codebase. Default: files changed since last commit.

## Audit Strategy

Launch 5 parallel agents using the Task tool (all with `run_in_background: true`):

### 1. Security Agent (security-reviewer)
- OWASP Top 10 vulnerabilities
- Hardcoded secrets/credentials
- SQL injection, XSS, command injection
- Auth/authz bypass risks
- Dependency vulnerabilities (check package.json/Cargo.toml/go.mod)

### 2. Quality Agent (reviewer)
- Code duplication
- Dead code / unused exports
- Error handling gaps (empty catch blocks, swallowed errors)
- Naming consistency
- SOLID principle violations

### 3. Performance Agent (explore)
- N+1 query patterns
- Unbounded loops / recursion
- Large bundle imports
- Memory leak risks (event listeners, subscriptions)
- Missing pagination / streaming

### 4. Architecture Agent (oracle-deep)
- Circular dependencies
- Layer violations (presentation → data, etc.)
- Coupling analysis
- API design consistency
- Breaking change risks

### 5. Test Coverage Agent (test-engineer)
- Untested public functions
- Missing edge case tests
- Test quality (assertions per test, mocking depth)
- Integration test gaps

## Output Format

After all agents complete, synthesize into a unified report:

```markdown
## Code Audit Report

### Critical (must fix)
- [SECURITY] file:line — description
- [BUG] file:line — description

### High (should fix)
- [QUALITY] file:line — description
- [PERFORMANCE] file:line — description

### Medium (consider)
- [ARCHITECTURE] file:line — description

### Low (nice to have)
- [STYLE] file:line — description

### Summary
- Files audited: N
- Issues found: N (critical: N, high: N, medium: N, low: N)
- Top risk areas: ...
```

## Rules
- Launch ALL agents in parallel (one message with multiple Task calls)
- Each agent should focus ONLY on its perspective
- Deduplicate findings across agents
- Severity levels: CRITICAL > HIGH > MEDIUM > LOW
- Always include file:line references
- If scope is "all", limit to 50 most important files (by recent changes, complexity)
