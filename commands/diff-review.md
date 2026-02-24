---
name: diff-review
model: sonnet
description: Multi-perspective parallel code review — analyze git diff from 5 viewpoints simultaneously.
---

You are performing a comprehensive multi-perspective code review on the current git diff.

## Usage
```
/not-my-reforge:diff-review [base-branch]   # default: main
```

## Process

### 1. Get the Diff
```bash
git diff [base-branch]...HEAD --stat
git diff [base-branch]...HEAD
```

### 2. Parallel Review (5 perspectives)
Launch 5 parallel Task agents, each reviewing the same diff from a different angle:

**Agent 1 — Bug Hunter** (Explore, haiku)
- Logic errors, off-by-one, null/undefined issues
- Race conditions, async/await mistakes
- Missing error handling, unchecked returns

**Agent 2 — Security Reviewer** (general-purpose, sonnet)
- Input validation, injection risks (XSS, SQLi, command injection)
- Secrets/credentials in code
- Auth/authz bypasses, OWASP Top 10

**Agent 3 — Performance Analyst** (Explore, haiku)
- N+1 queries, unnecessary allocations
- Missing memoization, inefficient algorithms
- Bundle size impact, lazy loading opportunities

**Agent 4 — Style & Conventions** (Explore, haiku)
- Naming consistency with codebase conventions
- Import style, export patterns
- Dead code, unused variables, commented-out code

**Agent 5 — Architecture Reviewer** (general-purpose, sonnet)
- SOLID principle violations
- Coupling/cohesion issues
- API design, abstraction leaks
- Breaking changes, backward compatibility

### 3. Synthesize
Merge findings from all 5 agents into a unified report.

## Output Format
```markdown
## Code Review Summary

### Critical (must fix)
- [BUG] `file:line` — description
- [SECURITY] `file:line` — description

### High (should fix)
- [PERF] `file:line` — description

### Medium (consider)
- [STYLE] `file:line` — description
- [ARCH] `file:line` — description

### Low (nitpick)
- items...

### Approved Files
- `file` — no issues found

### Overall Verdict: APPROVE / REQUEST CHANGES / NEEDS DISCUSSION
```

## Rules
- Always read the actual diff, don't just list files
- Provide file:line references for every finding
- Classify severity: CRITICAL > HIGH > MEDIUM > LOW
- If diff is large (>500 lines), focus on the most impactful changes
- Don't repeat the same finding from multiple perspectives
- End with a clear verdict
