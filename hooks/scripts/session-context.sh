#!/usr/bin/env bash
# session-context.sh — Load project context at session start
# Event: SessionStart (startup|resume)
# Exit: 0 (informational)

set -euo pipefail

INPUT=$(cat)
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')
SOURCE=$(echo "$INPUT" | jq -r '.source // "startup"')

if [[ -z "$CWD" || ! -d "$CWD" ]]; then
  exit 0
fi

cd "$CWD"

CONTEXT=""

# 1. Git status summary
if git rev-parse --is-inside-work-tree &>/dev/null; then
  BRANCH=$(git branch --show-current 2>/dev/null || echo "detached")
  MODIFIED=$(git diff --stat --shortstat 2>/dev/null || true)
  STAGED=$(git diff --cached --shortstat 2>/dev/null || true)
  UNTRACKED_COUNT=$(git ls-files --others --exclude-standard 2>/dev/null | wc -l | tr -d ' ')
  LAST_COMMIT=$(git log -1 --oneline 2>/dev/null || echo "no commits")

  CONTEXT="${CONTEXT}📌 Git: branch '${BRANCH}', last commit: ${LAST_COMMIT}"
  [[ -n "$MODIFIED" ]] && CONTEXT="${CONTEXT}\n   Modified: ${MODIFIED}"
  [[ -n "$STAGED" ]] && CONTEXT="${CONTEXT}\n   Staged: ${STAGED}"
  [[ "$UNTRACKED_COUNT" -gt 0 ]] && CONTEXT="${CONTEXT}\n   Untracked files: ${UNTRACKED_COUNT}"
fi

# 2. Detect project type
PROJECT_TYPE=""
[[ -f "package.json" ]] && PROJECT_TYPE="${PROJECT_TYPE}Node.js "
[[ -f "tsconfig.json" ]] && PROJECT_TYPE="${PROJECT_TYPE}TypeScript "
[[ -f "Cargo.toml" ]] && PROJECT_TYPE="${PROJECT_TYPE}Rust "
[[ -f "go.mod" ]] && PROJECT_TYPE="${PROJECT_TYPE}Go "
[[ -f "pyproject.toml" || -f "setup.py" || -f "requirements.txt" ]] && PROJECT_TYPE="${PROJECT_TYPE}Python "
[[ -f "Gemfile" ]] && PROJECT_TYPE="${PROJECT_TYPE}Ruby "
[[ -f "pom.xml" || -f "build.gradle" || -f "build.gradle.kts" ]] && PROJECT_TYPE="${PROJECT_TYPE}Java/Kotlin "
[[ -f "pubspec.yaml" ]] && PROJECT_TYPE="${PROJECT_TYPE}Flutter/Dart "

if [[ -n "$PROJECT_TYPE" ]]; then
  CONTEXT="${CONTEXT}\n🏗️ Project type: ${PROJECT_TYPE}"
fi

# 3. Check for handoff file (session resume context)
HANDOFF_FILE=".claude/handoff.md"
if [[ "$SOURCE" == "resume" && -f "$HANDOFF_FILE" ]]; then
  HANDOFF_PREVIEW=$(head -20 "$HANDOFF_FILE")
  CONTEXT="${CONTEXT}\n📋 Handoff note found (.claude/handoff.md):\n${HANDOFF_PREVIEW}"
elif [[ -f "$HANDOFF_FILE" ]]; then
  CONTEXT="${CONTEXT}\n📋 Handoff note available at .claude/handoff.md"
fi

# 4. Check for active TODO items in recent files
if git rev-parse --is-inside-work-tree &>/dev/null; then
  RECENT_TODOS=$(git diff --name-only HEAD 2>/dev/null | head -10 | xargs grep -l 'TODO\|FIXME' 2>/dev/null | head -5 || true)
  if [[ -n "$RECENT_TODOS" ]]; then
    TODO_COUNT=$(echo "$RECENT_TODOS" | wc -l | tr -d ' ')
    CONTEXT="${CONTEXT}\n⚠️ ${TODO_COUNT} changed file(s) contain TODOs — address before finishing"
  fi
fi

if [[ -n "$CONTEXT" ]]; then
  # Escape for JSON
  ESCAPED_CONTEXT=$(echo -e "$CONTEXT" | jq -Rs .)
  cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": ${ESCAPED_CONTEXT}
  }
}
EOF
fi

exit 0
