#!/usr/bin/env bash
# write-guard.sh — Block Write tool on existing files (should use Edit instead)
# Event: PreToolUse (Write)
# Exit: 0 (allow), 2 (block)

set -euo pipefail

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

# Allow if file doesn't exist (new file creation is fine)
if [[ ! -f "$FILE_PATH" ]]; then
  exit 0
fi

# Count lines in existing file
LINE_COUNT=$(wc -l < "$FILE_PATH" 2>/dev/null | tr -d ' ')

# Allow overwriting very small files (< 5 lines) — likely config/placeholder
if [[ "$LINE_COUNT" -lt 5 ]]; then
  exit 0
fi

# Allow specific file types that are typically regenerated
BASENAME=$(basename "$FILE_PATH")
case "$BASENAME" in
  *.lock|*.sum|*.min.js|*.min.css|*.map|*.generated.*|*.g.dart)
    exit 0
    ;;
  package-lock.json|yarn.lock|pnpm-lock.yaml|Cargo.lock|go.sum|composer.lock)
    exit 0
    ;;
esac

# Block: existing file with 5+ lines should use Edit, not Write
cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "🛡️ Write blocked on existing file '${BASENAME}' (${LINE_COUNT} lines). Use the Edit tool instead to make targeted changes. Write overwrites the entire file and risks losing content."
  }
}
EOF
exit 0
