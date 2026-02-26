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
elif [[ -x "/opt/homebrew/bin/node" ]]; then
  NODE_BIN="/opt/homebrew/bin/node"
elif [[ -n "${NVM_DIR:-}" && -s "$NVM_DIR/nvm.sh" ]]; then
  # nvm: source nvm and resolve node
  NODE_BIN=$(. "$NVM_DIR/nvm.sh" 2>/dev/null && command -v node 2>/dev/null || true)
elif [[ -s "$HOME/.nvm/nvm.sh" ]]; then
  # nvm: fallback when NVM_DIR is not set
  NODE_BIN=$(NVM_DIR="$HOME/.nvm" . "$HOME/.nvm/nvm.sh" 2>/dev/null && command -v node 2>/dev/null || true)
elif [[ -x "$HOME/.local/share/fnm/aliases/default/bin/node" ]]; then
  NODE_BIN="$HOME/.local/share/fnm/aliases/default/bin/node"
elif [[ -n "$(command -v fnm 2>/dev/null)" ]]; then
  NODE_BIN=$(eval "$(fnm env 2>/dev/null)" && command -v node 2>/dev/null || true)
elif [[ -x "$HOME/.volta/bin/node" ]]; then
  NODE_BIN="$HOME/.volta/bin/node"
elif [[ -x "$HOME/.asdf/shims/node" ]]; then
  NODE_BIN="$HOME/.asdf/shims/node"
fi

# If Node.js found and compiled hook exists, run it
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
