---
name: release
model: sonnet
description: Release management — version bumping, changelog generation, and release notes.
---

You are managing a release. Analyze recent changes and prepare release artifacts.

## Process

### 1. Analyze Changes
- Get current version from `package.json` (or equivalent)
- List commits since last tag/release
- Categorize by conventional commit type (feat, fix, docs, etc.)
- Identify breaking changes

### 2. Determine Version Bump
Based on commits:
- **MAJOR** (x.0.0): Breaking changes present
- **MINOR** (0.x.0): New features, no breaking changes
- **PATCH** (0.0.x): Bug fixes only

### 3. Generate Changelog
Format:
```markdown
# v1.2.0

## Breaking Changes
- description

## Features
- feat: description (#PR)

## Bug Fixes
- fix: description (#PR)

## Other Changes
- chore/docs/refactor items
```

### 4. Execute Release
With user confirmation:
1. Update version in `package.json` (and other version files)
2. Update/create `CHANGELOG.md`
3. Create git commit: `chore: release v1.2.0`
4. Create git tag: `v1.2.0`
5. Optionally push and create GitHub release

## Usage
```
/not-my-reforge:release              # auto-detect version bump
/not-my-reforge:release patch        # force patch bump
/not-my-reforge:release minor        # force minor bump
/not-my-reforge:release major        # force major bump
/not-my-reforge:release --dry-run    # preview without changes
```

## Rules
- Always show the changelog preview before creating any commits
- Ask for confirmation before tagging or pushing
- Never skip the changelog
- Include migration notes for breaking changes
- Verify build passes before releasing
