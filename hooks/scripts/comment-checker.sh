#!/usr/bin/env bash
# comment-checker.sh — Detect AI slop comments in written/edited files
# Event: PostToolUse (Write|Edit)
# Exit: 0 (warning only, never blocks)

set -euo pipefail

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [[ -z "$FILE_PATH" || ! -f "$FILE_PATH" ]]; then
  exit 0
fi

# Determine plugin root
PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/../.." && pwd)}"
PATTERNS_FILE="${PLUGIN_ROOT}/scripts/slop-patterns.txt"

if [[ ! -f "$PATTERNS_FILE" ]]; then
  exit 0
fi

# Extract comment lines from the file based on extension
EXT="${FILE_PATH##*.}"
COMMENT_REGEX=""
case "$EXT" in
  js|ts|jsx|tsx|java|go|rs|c|cpp|h|swift|kt)
    COMMENT_REGEX='^\s*(//|/\*|\*)'
    ;;
  py|rb|sh|bash|yaml|yml|toml)
    COMMENT_REGEX='^\s*#'
    ;;
  html|xml|svelte|vue)
    COMMENT_REGEX='^\s*<!--'
    ;;
  css|scss|less)
    COMMENT_REGEX='^\s*/\*'
    ;;
  *)
    # Unknown extension, check both styles
    COMMENT_REGEX='^\s*(//|#|/\*|\*|<!--)'
    ;;
esac

# Extract comments from the file
COMMENTS=$(grep -E "$COMMENT_REGEX" "$FILE_PATH" 2>/dev/null || true)

if [[ -z "$COMMENTS" ]]; then
  exit 0
fi

# Check each pattern against comments
MATCHES=""
while IFS= read -r pattern; do
  # Skip empty lines and comments
  [[ -z "$pattern" || "$pattern" =~ ^# ]] && continue

  FOUND=$(echo "$COMMENTS" | grep -iE "$pattern" 2>/dev/null || true)
  if [[ -n "$FOUND" ]]; then
    # Trim and take first match only for the report
    FIRST=$(echo "$FOUND" | head -1 | sed 's/^[[:space:]]*//')
    MATCHES="${MATCHES}\n  - Pattern '${pattern}': ${FIRST}"
  fi
done < "$PATTERNS_FILE"

if [[ -n "$MATCHES" ]]; then
  # Output JSON with warning context
  cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "⚠️ AI slop comments detected in ${FILE_PATH##*/}:${MATCHES}\n\nPlease remove or rewrite these comments to be genuinely useful, or remove them entirely. Good comments explain WHY, not WHAT."
  }
}
EOF
fi

exit 0
