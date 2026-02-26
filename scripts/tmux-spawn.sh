#!/usr/bin/env bash
# tmux-spawn.sh — Launch parallel Claude agents in tmux panes
# Usage: bash tmux-spawn.sh <session-name> "prompt1" "prompt2" ["prompt3" ...]
#
# Each prompt runs in a separate tmux pane within the same session.
# All agents share the same working directory (no worktree isolation).
# Use tmux-spawn-worktree.sh for file-level isolation.

set -euo pipefail

SESSION_NAME="${1:?Usage: tmux-spawn.sh <session-name> \"prompt1\" \"prompt2\" ...}"
shift

if [[ $# -lt 1 ]]; then
  echo "Error: At least one prompt is required" >&2
  exit 1
fi

# Check dependencies
if ! command -v tmux &>/dev/null; then
  echo "Error: tmux is not installed. Install with: brew install tmux" >&2
  exit 1
fi

if ! command -v claude &>/dev/null; then
  echo "Error: claude CLI is not installed" >&2
  exit 1
fi

# Resolve absolute path so tmux panes find the binary regardless of PATH
CLAUDE_BIN=$(command -v claude)

PROMPTS=("$@")
NUM_AGENTS=${#PROMPTS[@]}
CWD=$(pwd)

echo "🚀 Spawning ${NUM_AGENTS} parallel agents in tmux session '${SESSION_NAME}'"
echo "   Working directory: ${CWD}"
echo ""

# Kill existing session if present
tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true

# Create new session with first agent
FIRST_PROMPT="${PROMPTS[0]}"
tmux new-session -d -s "$SESSION_NAME" -c "$CWD" \
  "echo '🤖 Agent 1/${NUM_AGENTS}'; \"${CLAUDE_BIN}\" -p \"${FIRST_PROMPT}\" --output-format json 2>&1 | tee /tmp/claude-spawn-${SESSION_NAME}-1.json; echo '✅ Agent 1 complete'; read"

# Add remaining agents as new panes
for i in $(seq 1 $((NUM_AGENTS - 1))); do
  AGENT_NUM=$((i + 1))
  PROMPT="${PROMPTS[$i]}"
  tmux split-window -t "$SESSION_NAME" -c "$CWD" \
    "echo '🤖 Agent ${AGENT_NUM}/${NUM_AGENTS}'; \"${CLAUDE_BIN}\" -p \"${PROMPT}\" --output-format json 2>&1 | tee /tmp/claude-spawn-${SESSION_NAME}-${AGENT_NUM}.json; echo '✅ Agent ${AGENT_NUM} complete'; read"
  tmux select-layout -t "$SESSION_NAME" tiled
done

# Attach to session
echo "📋 Agents launched. Output files:"
for i in $(seq 1 "$NUM_AGENTS"); do
  echo "   Agent $i: /tmp/claude-spawn-${SESSION_NAME}-${i}.json"
done
echo ""
echo "Attaching to tmux session..."
echo "   Detach: Ctrl-b d | Kill: tmux kill-session -t ${SESSION_NAME}"
echo ""

tmux attach-session -t "$SESSION_NAME"
