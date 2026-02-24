---
name: pr
model: sonnet
description: Generate PR metadata — title, description, changed files summary, and test plan.
---

You are preparing a pull request. Analyze the current branch and generate comprehensive PR metadata.

## Process

### 1. Gather Context
- Get current branch name and base branch
- List all commits since divergence from base
- Get changed files with stats
- Read key changed files for context

### 2. Generate PR Title
- Derive from branch name or commit messages
- Use conventional format: `type: description`
- Keep under 70 characters
- Be specific about what changed

### 3. Generate PR Description
Structure the body with:

```markdown
## Summary
Brief description of what this PR does and why.

## Changes
- List of key changes with context
- Group by area (e.g., API, UI, Config)

## Changed Files
- `path/to/file.ts` — description of change

## Test Plan
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual verification: <specific steps>

## Screenshots
(if UI changes)

## Notes
- Any migration steps
- Breaking changes
- Dependencies added/removed
```

### 4. Create PR
Use `gh pr create` with the generated metadata:
```bash
gh pr create --title "title" --body "body"
```

## Rules
- Read the actual diff to understand changes, don't just list files
- Highlight breaking changes prominently
- Include specific test steps, not generic "tests pass"
- Mention any deployment considerations
- If the diff is large (>500 lines), summarize by area rather than listing every file
