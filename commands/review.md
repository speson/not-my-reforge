---
name: review
description: Code review based on git diff. Reviews staged/unstaged changes or a specific commit range for bugs, security issues, and code quality.
model: sonnet
argument-hint: [commit range or branch, default: staged + unstaged changes]
allowed-tools: Read, Glob, Grep, Bash(git *)
---

Perform a thorough code review of the current changes.

## Scope
- If arguments provided: review the specified commit range or branch diff
  - Example: `main..HEAD`, `abc123`, `feature-branch`
- If no arguments: review all staged and unstaged changes (`git diff HEAD`)

## Step 1: Gather Changes
```bash
# Default: all changes vs HEAD
git diff HEAD --stat
git diff HEAD
```
If $ARGUMENTS is provided:
```bash
git diff $ARGUMENTS --stat
git diff $ARGUMENTS
```

## Step 2: Review Each Changed File
For each modified file:
1. Read the full file for context (not just the diff)
2. Check related files (imports, tests, types)
3. Apply the review checklist

## Review Checklist
- [ ] **Correctness**: Logic errors, off-by-one, null handling
- [ ] **Security**: Injection, XSS, CSRF, secrets, auth bypass
- [ ] **Performance**: N+1 queries, unnecessary computation, memory leaks
- [ ] **Error Handling**: Uncaught exceptions, silent failures
- [ ] **Types**: Type safety, proper generics, no unsafe casts
- [ ] **Tests**: Are changes covered? Edge cases tested?
- [ ] **Conventions**: Consistent with project patterns
- [ ] **Dependencies**: New deps justified? Vulnerabilities?

## Step 3: Output

### Review Summary
| Category | Findings |
|----------|----------|
| Critical | N |
| High     | N |
| Medium   | N |
| Low      | N |

### Findings
For each issue:
- **[SEVERITY]** Title — `file:line`
- Issue: what's wrong
- Suggestion: how to fix

### Verdict
- APPROVE: No critical/high issues
- REQUEST_CHANGES: Critical or high issues found
- COMMENT: Only medium/low issues

$ARGUMENTS
