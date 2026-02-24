#!/usr/bin/env bash
# todo-enforcer.sh — Block session stop if changed files contain unresolved TODOs
# Event: Stop
# Exit: 0 (clean), 2 (block — force Claude to address TODOs)

set -euo pipefail

INPUT=$(cat)
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')

if [[ -z "$CWD" || ! -d "$CWD" ]]; then
  exit 0
fi

cd "$CWD"

# Check if we're in a git repo
if ! git rev-parse --is-inside-work-tree &>/dev/null; then
  exit 0
fi

# Get files changed in this session (staged + unstaged + untracked)
CHANGED_FILES=$(git diff --name-only HEAD 2>/dev/null || true)
STAGED_FILES=$(git diff --cached --name-only 2>/dev/null || true)
UNTRACKED_FILES=$(git ls-files --others --exclude-standard 2>/dev/null || true)

ALL_FILES=$(echo -e "${CHANGED_FILES}\n${STAGED_FILES}\n${UNTRACKED_FILES}" | sort -u | grep -v '^$' || true)

if [[ -z "$ALL_FILES" ]]; then
  exit 0
fi

# Search for TODO/FIXME/HACK/XXX in changed files
TODO_REPORT=""
TODO_COUNT=0

while IFS= read -r file; do
  [[ -z "$file" || ! -f "$file" ]] && continue

  # Skip binary files and specific patterns
  case "$file" in
    *.png|*.jpg|*.gif|*.ico|*.woff|*.woff2|*.ttf|*.eot|*.lock|*.min.js|*.min.css)
      continue
      ;;
  esac

  TODOS=$(grep -nE '(TODO|FIXME|HACK|XXX)(\(|:|\s)' "$file" 2>/dev/null || true)
  if [[ -n "$TODOS" ]]; then
    FILE_TODOS=$(echo "$TODOS" | head -5)
    FILE_COUNT=$(echo "$TODOS" | wc -l | tr -d ' ')
    TODO_COUNT=$((TODO_COUNT + FILE_COUNT))
    TODO_REPORT="${TODO_REPORT}\n📄 ${file} (${FILE_COUNT} items):\n${FILE_TODOS}"
    if [[ "$FILE_COUNT" -gt 5 ]]; then
      TODO_REPORT="${TODO_REPORT}\n  ... and $((FILE_COUNT - 5)) more"
    fi
  fi
done <<< "$ALL_FILES"

if [[ "$TODO_COUNT" -gt 0 ]]; then
  # Block the stop — Claude must address TODOs
  cat >&2 <<EOF
🚫 Cannot stop: ${TODO_COUNT} unresolved TODO/FIXME found in changed files.
${TODO_REPORT}

Please resolve these TODOs before finishing:
  1. Implement the TODO items, OR
  2. Remove them if no longer needed, OR
  3. Convert to tracked issues (e.g., GitHub issues)
EOF
  exit 2
fi

exit 0
