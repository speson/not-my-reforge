#!/usr/bin/env bash
# hud-statusline.sh — Update tmux status-right with not-my-reforge HUD
# Usage: bash hud-statusline.sh [project-dir]
#
# Reads .omo/session-metrics.json and formats a compact status line.
# Designed to be called from PostToolUse hook (async) or polled via tmux.

set -euo pipefail

PROJECT_DIR="${1:-.}"
METRICS_FILE="${PROJECT_DIR}/.omo/session-metrics.json"

if [[ ! -f "$METRICS_FILE" ]]; then
  exit 0
fi

# Check if we're in tmux
if [[ -z "${TMUX:-}" ]]; then
  exit 0
fi

# Read metrics with jq (if available) or node
if command -v jq &>/dev/null; then
  TOTAL=$(jq -r '.totalToolCalls // 0' "$METRICS_FILE" 2>/dev/null || echo "0")
  FAILURES=$(jq -r '.totalFailures // 0' "$METRICS_FILE" 2>/dev/null || echo "0")
  AGENTS=$(jq -r '.agentsSpawned // 0' "$METRICS_FILE" 2>/dev/null || echo "0")
  TOKENS=$(jq -r '.estimatedTokens // 0' "$METRICS_FILE" 2>/dev/null || echo "0")
  STARTED=$(jq -r '.startedAt // ""' "$METRICS_FILE" 2>/dev/null || echo "")
else
  # Minimal parsing without jq
  TOTAL=$(grep -o '"totalToolCalls":[0-9]*' "$METRICS_FILE" 2>/dev/null | cut -d: -f2 || echo "0")
  FAILURES=$(grep -o '"totalFailures":[0-9]*' "$METRICS_FILE" 2>/dev/null | cut -d: -f2 || echo "0")
  AGENTS=$(grep -o '"agentsSpawned":[0-9]*' "$METRICS_FILE" 2>/dev/null | cut -d: -f2 || echo "0")
  TOKENS=$(grep -o '"estimatedTokens":[0-9]*' "$METRICS_FILE" 2>/dev/null | cut -d: -f2 || echo "0")
  STARTED=""
fi

# Calculate duration
if [[ -n "$STARTED" ]]; then
  START_EPOCH=$(date -j -f "%Y-%m-%dT%H:%M:%S" "${STARTED%%.*}" "+%s" 2>/dev/null || date -d "${STARTED}" "+%s" 2>/dev/null || echo "0")
  NOW_EPOCH=$(date "+%s")
  if [[ "$START_EPOCH" -gt 0 ]]; then
    DIFF=$((NOW_EPOCH - START_EPOCH))
    if [[ $DIFF -lt 60 ]]; then
      DURATION="${DIFF}s"
    elif [[ $DIFF -lt 3600 ]]; then
      DURATION="$((DIFF / 60))m"
    else
      DURATION="$((DIFF / 3600))h$((DIFF % 3600 / 60))m"
    fi
  else
    DURATION="?"
  fi
else
  DURATION="?"
fi

# Context usage percentage
CTX_PCT=$((TOKENS * 100 / 200000))

# Build status line
STATUS="reforge: ${DURATION} | ${TOTAL} calls"
if [[ "$FAILURES" -gt 0 ]]; then
  STATUS="${STATUS} | ${FAILURES} err"
fi
if [[ "$AGENTS" -gt 0 ]]; then
  STATUS="${STATUS} | ${AGENTS} agents"
fi
STATUS="${STATUS} | ctx:${CTX_PCT}%"

# Update tmux status
tmux set-option -g status-right " ${STATUS} " 2>/dev/null || true
