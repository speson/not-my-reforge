#!/usr/bin/env bash
# tmux-spawn-worktree.sh — Launch parallel Claude agents with git worktree isolation
# Usage: bash tmux-spawn-worktree.sh <session-name> "prompt1" "prompt2" ["prompt3" ...]
#
# Each agent gets its own git worktree, preventing file conflicts.
# After all agents complete, results can be merged back.

set -euo pipefail

SESSION_NAME="${1:?Usage: tmux-spawn-worktree.sh <session-name> \"prompt1\" \"prompt2\" ...}"
shift

if [[ $# -lt 1 ]]; then
  echo "Error: At least one prompt is required" >&2
  exit 1
fi

# Check dependencies
for cmd in tmux claude git; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "Error: ${cmd} is not installed" >&2
    exit 1
  fi
done

# Must be in a git repo
if ! git rev-parse --is-inside-work-tree &>/dev/null; then
  echo "Error: Not inside a git repository" >&2
  exit 1
fi

REPO_ROOT=$(git rev-parse --show-toplevel)
CURRENT_BRANCH=$(git branch --show-current)
PROMPTS=("$@")
NUM_AGENTS=${#PROMPTS[@]}
WORKTREE_BASE="/tmp/claude-worktrees/${SESSION_NAME}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

echo "🚀 Spawning ${NUM_AGENTS} isolated agents in tmux session '${SESSION_NAME}'"
echo "   Repository: ${REPO_ROOT}"
echo "   Base branch: ${CURRENT_BRANCH}"
echo "   Worktrees: ${WORKTREE_BASE}/"
echo ""

# Ensure clean state
if [[ -n "$(git status --porcelain)" ]]; then
  echo "⚠️  Warning: Working tree has uncommitted changes."
  echo "   Worktrees will branch from the current HEAD commit."
  echo "   Uncommitted changes will NOT be in worktrees."
  echo ""
  read -p "Continue? [y/N] " -n 1 -r
  echo ""
  [[ $REPLY =~ ^[Yy]$ ]] || exit 1
fi

# Kill existing tmux session
tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true

# Create worktrees directory
mkdir -p "$WORKTREE_BASE"

# Create worktrees and branches
BRANCHES=()
for i in $(seq 1 "$NUM_AGENTS"); do
  BRANCH_NAME="spawn/${SESSION_NAME}/${i}-${TIMESTAMP}"
  WORKTREE_PATH="${WORKTREE_BASE}/agent-${i}"

  # Clean up existing worktree if present
  if [[ -d "$WORKTREE_PATH" ]]; then
    git -C "$REPO_ROOT" worktree remove "$WORKTREE_PATH" --force 2>/dev/null || rm -rf "$WORKTREE_PATH"
  fi

  # Create worktree with new branch
  git -C "$REPO_ROOT" worktree add -b "$BRANCH_NAME" "$WORKTREE_PATH" HEAD
  BRANCHES+=("$BRANCH_NAME")

  echo "   Created worktree ${i}: ${WORKTREE_PATH} (branch: ${BRANCH_NAME})"
done
echo ""

# Create tmux session with first agent
FIRST_PROMPT="${PROMPTS[0]}"
FIRST_WORKTREE="${WORKTREE_BASE}/agent-1"
tmux new-session -d -s "$SESSION_NAME" -c "$FIRST_WORKTREE" \
  "echo '🤖 Agent 1/${NUM_AGENTS} (worktree: agent-1)'; echo 'Branch: ${BRANCHES[0]}'; echo '---'; claude -p \"${FIRST_PROMPT}\" --output-format json 2>&1 | tee /tmp/claude-spawn-${SESSION_NAME}-1.json; echo ''; echo '✅ Agent 1 complete'; read"

# Add remaining agents as new panes
for i in $(seq 1 $((NUM_AGENTS - 1))); do
  AGENT_NUM=$((i + 1))
  PROMPT="${PROMPTS[$i]}"
  WORKTREE="${WORKTREE_BASE}/agent-${AGENT_NUM}"
  tmux split-window -t "$SESSION_NAME" -c "$WORKTREE" \
    "echo '🤖 Agent ${AGENT_NUM}/${NUM_AGENTS} (worktree: agent-${AGENT_NUM})'; echo 'Branch: ${BRANCHES[$i]}'; echo '---'; claude -p \"${PROMPT}\" --output-format json 2>&1 | tee /tmp/claude-spawn-${SESSION_NAME}-${AGENT_NUM}.json; echo ''; echo '✅ Agent ${AGENT_NUM} complete'; read"
  tmux select-layout -t "$SESSION_NAME" tiled
done

echo "📋 All agents launched."
echo ""
echo "Output files:"
for i in $(seq 1 "$NUM_AGENTS"); do
  echo "   Agent $i: /tmp/claude-spawn-${SESSION_NAME}-${i}.json"
done
echo ""
echo "Merge commands (run after all agents complete):"
echo "   cd ${REPO_ROOT}"
for i in $(seq 1 "$NUM_AGENTS"); do
  echo "   git merge ${BRANCHES[$((i-1))]}  # Agent $i"
done
echo ""
echo "Cleanup:"
echo "   git -C ${REPO_ROOT} worktree prune"
for i in $(seq 1 "$NUM_AGENTS"); do
  echo "   git branch -d ${BRANCHES[$((i-1))]}"
done
echo ""
echo "Attaching to tmux session..."
echo "   Detach: Ctrl-b d | Kill: tmux kill-session -t ${SESSION_NAME}"
echo ""

tmux attach-session -t "$SESSION_NAME"
