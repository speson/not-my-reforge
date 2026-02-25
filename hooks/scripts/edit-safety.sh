#!/usr/bin/env bash
# edit-safety.sh — Provide recovery guidance when Edit tool fails
# Event: PostToolUse (Edit)
# Exit: 0 (informational only)

set -euo pipefail

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
TOOL_RESPONSE=$(echo "$INPUT" | jq -r '.tool_response // empty')

# Check if the edit was successful
IS_ERROR=$(echo "$INPUT" | jq -r '.tool_response.is_error // false')

if [[ "$IS_ERROR" != "true" ]]; then
  exit 0
fi

ERROR_MSG=$(echo "$INPUT" | jq -r '.tool_response.content // .tool_response.error // "Unknown error"' 2>/dev/null)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // "unknown"')

cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "⚠️ Edit failed on ${FILE_PATH##*/}: ${ERROR_MSG}\n\nRecovery steps:\n1. Re-read the file to get current content (it may have changed)\n2. Use a larger unique context in old_string to avoid ambiguity\n3. Check for whitespace/indentation mismatches\n4. If the file structure changed significantly, consider a targeted Write for that section\n\nDo NOT retry the same edit without re-reading the file first."
  }
}
EOF

exit 0
