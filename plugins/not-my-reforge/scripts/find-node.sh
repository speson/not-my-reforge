#!/usr/bin/env bash
# find-node.sh — Bridge script to execute compiled TS hooks via Node.js
# Usage: bash find-node.sh <hook-name>.js
# Falls back to equivalent bash script if Node.js is unavailable

set -euo pipefail

HOOK_NAME="${1:?Usage: find-node.sh <hook-name>.js}"
PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
HOOK_PATH="${PLUGIN_ROOT}/dist/hooks/${HOOK_NAME}"

# Try to find Node.js
NODE_BIN=""
if command -v node &>/dev/null; then
  NODE_BIN="node"
elif [[ -x "/usr/local/bin/node" ]]; then
  NODE_BIN="/usr/local/bin/node"
elif [[ -x "$HOME/.nvm/current/bin/node" ]]; then
  NODE_BIN="$HOME/.nvm/current/bin/node"
elif [[ -x "$HOME/.volta/bin/node" ]]; then
  NODE_BIN="$HOME/.volta/bin/node"
elif [[ -x "$HOME/.asdf/shims/node" ]]; then
  NODE_BIN="$HOME/.asdf/shims/node"
fi

# If Node.js found and compiled hook exists, use it
if [[ -n "$NODE_BIN" && -f "$HOOK_PATH" ]]; then
  exec "$NODE_BIN" "$HOOK_PATH"
fi

# Fallback: try equivalent bash script
BASH_NAME="${HOOK_NAME%.js}.sh"
BASH_PATH="${PLUGIN_ROOT}/hooks/scripts/${BASH_NAME}"

if [[ -f "$BASH_PATH" ]]; then
  exec bash "$BASH_PATH"
fi

# No handler found — exit silently (don't block)
exit 0
