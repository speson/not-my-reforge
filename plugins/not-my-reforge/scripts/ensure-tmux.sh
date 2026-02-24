#!/usr/bin/env bash
# ensure-tmux.sh — Auto-detect and install tmux on macOS via Homebrew
# Runs as a SessionStart hook. Outputs JSON for Claude Code hook system.

set -euo pipefail

# Already installed — exit silently
if command -v tmux &>/dev/null; then
  exit 0
fi

# macOS only
if [[ "$(uname)" != "Darwin" ]]; then
  echo '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"[tmux] Not installed. Auto-install is macOS-only. Install manually for parallel execution (spawn/team)."}}'
  exit 0
fi

# Homebrew required
if ! command -v brew &>/dev/null; then
  echo '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"[tmux] Not installed. Homebrew not found. Run: /bin/bash -c \"$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\" then: brew install tmux"}}'
  exit 0
fi

# Attempt install
if brew install tmux &>/dev/null; then
  VERSION=$(tmux -V 2>/dev/null || echo "unknown")
  echo "{\"hookSpecificOutput\":{\"hookEventName\":\"SessionStart\",\"additionalContext\":\"[tmux] Installed ${VERSION} via Homebrew. Parallel execution (spawn/team) is now available.\"}}"
else
  echo '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"[tmux] brew install tmux failed. Run manually: brew install tmux"}}'
fi
