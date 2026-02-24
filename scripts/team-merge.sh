#!/usr/bin/env bash
# team-merge.sh — Sequentially merge worker branches with conflict detection
# Usage: bash team-merge.sh <team-session> [base-branch]
#
# Merges all spawn/<team-session>/* branches into the base branch.
# Stops on conflict with actionable guidance.

set -euo pipefail

SESSION="${1:?Usage: team-merge.sh <team-session> [base-branch]}"
BASE_BRANCH="${2:-$(git branch --show-current)}"

if ! git rev-parse --is-inside-work-tree &>/dev/null; then
  echo "Error: Not inside a git repository" >&2
  exit 1
fi

REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"

# Find worker branches
BRANCHES=($(git branch --list "spawn/${SESSION}/*" | sed 's/^[ *]*//' | sort))

if [[ ${#BRANCHES[@]} -eq 0 ]]; then
  echo "No branches found matching spawn/${SESSION}/*" >&2
  echo "Available spawn branches:" >&2
  git branch --list "spawn/*" | head -20 >&2
  exit 1
fi

echo "=== Team Merge: ${SESSION} ==="
echo "Base branch: ${BASE_BRANCH}"
echo "Worker branches: ${#BRANCHES[@]}"
for b in "${BRANCHES[@]}"; do
  CHANGED=$(git diff --stat "${BASE_BRANCH}...${b}" 2>/dev/null | tail -1)
  echo "  - ${b} (${CHANGED:-no changes})"
done
echo ""

# Check for potential conflicts between branches
echo "--- Conflict Pre-Check ---"
CONFLICT_PAIRS=()
for ((i=0; i<${#BRANCHES[@]}; i++)); do
  for ((j=i+1; j<${#BRANCHES[@]}; j++)); do
    FILES_I=$(git diff --name-only "${BASE_BRANCH}...${BRANCHES[$i]}" 2>/dev/null || true)
    FILES_J=$(git diff --name-only "${BASE_BRANCH}...${BRANCHES[$j]}" 2>/dev/null || true)
    OVERLAP=$(comm -12 <(echo "$FILES_I" | sort) <(echo "$FILES_J" | sort) 2>/dev/null || true)
    if [[ -n "$OVERLAP" ]]; then
      echo "Warning: ${BRANCHES[$i]} and ${BRANCHES[$j]} both modify:"
      echo "$OVERLAP" | sed 's/^/    /'
      CONFLICT_PAIRS+=("${BRANCHES[$i]}+${BRANCHES[$j]}")
    fi
  done
done

if [[ ${#CONFLICT_PAIRS[@]} -eq 0 ]]; then
  echo "No file overlaps detected. Merge should be clean."
fi
echo ""

# Ensure we're on base branch
git checkout "$BASE_BRANCH" 2>/dev/null

MERGED=()
FAILED=""

echo "--- Merging ---"
for BRANCH in "${BRANCHES[@]}"; do
  WORKER=$(echo "$BRANCH" | sed "s|spawn/${SESSION}/||")
  echo -n "Merging ${WORKER}... "

  if git merge --no-edit "$BRANCH" &>/dev/null; then
    echo "OK"
    MERGED+=("$BRANCH")
  else
    echo "CONFLICT"
    FAILED="$BRANCH"
    echo ""
    echo "Merge conflict with branch: ${BRANCH}"
    echo ""
    echo "Conflicting files:"
    git diff --name-only --diff-filter=U 2>/dev/null | sed 's/^/  /'
    echo ""
    echo "Resolution options:"
    echo "  1. Resolve manually, then: git add . && git commit"
    echo "  2. Abort this merge: git merge --abort"
    echo "  3. Skip this branch: git merge --abort && bash $0 ${SESSION} ${BASE_BRANCH}"
    echo ""
    echo "After resolving, re-run to continue with remaining branches."
    break
  fi
done

echo ""
echo "--- Summary ---"
echo "Merged: ${#MERGED[@]}/${#BRANCHES[@]}"
for b in "${MERGED[@]}"; do
  echo "  [OK] $b"
done
if [[ -n "$FAILED" ]]; then
  echo "  [CONFLICT] $FAILED"
  REMAINING=$((${#BRANCHES[@]} - ${#MERGED[@]} - 1))
  if [[ $REMAINING -gt 0 ]]; then
    echo "  [PENDING] ${REMAINING} branch(es) remaining"
  fi
  exit 1
fi

echo ""
echo "All branches merged successfully."
echo ""
echo "Cleanup commands:"
echo "  # Remove worktrees"
echo "  git worktree prune"
echo "  # Delete worker branches"
for b in "${BRANCHES[@]}"; do
  echo "  git branch -d ${b}"
done
