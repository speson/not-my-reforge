#!/usr/bin/env bash
# sidebar-pane.sh — Unified sidebar: Shortcut + Todo + Git Diff
# Usage: bash sidebar-pane.sh <project-cwd>
# Polls data sources every 2s, re-renders on change

set -euo pipefail

CWD="${1:-.}"
TODO_FILE="${CWD}/.reforge/todo-state.json"
MODE_FILE="${CWD}/.reforge/mode-registry.json"
SHORTCUT_FILE="${CWD}/.reforge/shortcut-state.json"

# Colors
C_RESET="\033[0m"
C_GREEN="\033[32m"
C_YELLOW="\033[33m"
C_RED="\033[31m"
C_DIM="\033[2m"
C_BOLD="\033[1m"
C_CYAN="\033[36m"
C_MAGENTA="\033[35m"

# Symbols
S_DONE="✓"
S_ACTIVE="◆"
S_PENDING="○"

last_hash=""
git_cache=""
git_cache_time=0

# Read version from package.json
PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$CWD}"
VERSION=""
if command -v jq &>/dev/null; then
  VERSION=$(jq -r '.version // "0.0.0"' "$PLUGIN_ROOT/package.json" 2>/dev/null || echo "0.0.0")
else
  VERSION=$(sed -n 's/.*"version".*"\(.*\)".*/\1/p' "$PLUGIN_ROOT/package.json" 2>/dev/null | head -1)
  [[ -z "$VERSION" ]] && VERSION="0.0.0"
fi

# ── Helpers ──────────────────────────────────────────────

get_width() {
  local w
  w=$(tput cols 2>/dev/null || echo 38)
  if [[ $w -lt 20 ]]; then w=38; fi
  echo "$w"
}

print_separator() {
  local width="$1"
  printf "${C_DIM}"
  printf '─%.0s' $(seq 1 "$width")
  printf "${C_RESET}\n"
}

# ── Shortcut Section ─────────────────────────────────────

render_shortcut() {
  local width="$1"

  echo ""
  echo -e "  ${C_BOLD}${C_MAGENTA}SHORTCUT${C_RESET}"

  local has_content=false

  # 1) Active mode from mode-registry.json
  if [[ -f "$MODE_FILE" ]]; then
    local mode_name="" mode_goal="" activated_at=0

    if command -v jq &>/dev/null; then
      mode_name=$(jq -r '.activeMode.name // empty' "$MODE_FILE" 2>/dev/null || true)
      mode_goal=$(jq -r '.activeMode.goal // empty' "$MODE_FILE" 2>/dev/null || true)
      activated_at=$(jq -r '.activeMode.activatedAt // 0' "$MODE_FILE" 2>/dev/null || echo 0)
    fi

    if [[ -n "$mode_name" ]]; then
      has_content=true
      local max_goal=$((width - 6))
      if [[ ${#mode_goal} -gt $max_goal ]]; then
        mode_goal="${mode_goal:0:$((max_goal - 2))}.."
      fi
      echo -e "  ${C_YELLOW}${S_ACTIVE} ${mode_name}${C_RESET} ${C_DIM}— ${mode_goal}${C_RESET}"

      if [[ "$activated_at" -gt 0 ]]; then
        local now
        now=$(date +%s)
        local elapsed=$((now - activated_at / 1000))
        if [[ $elapsed -lt 0 ]]; then elapsed=0; fi
        local mins=$((elapsed / 60))
        local secs=$((elapsed % 60))
        echo -e "  ${C_DIM}⏱ ${mins}m ${secs}s${C_RESET}"
      fi
    fi
  fi

  # 2) Last used shortcut from shortcut-state.json
  if [[ -f "$SHORTCUT_FILE" ]]; then
    local sc_name="" sc_used_at=0 sc_context=""

    if command -v jq &>/dev/null; then
      sc_name=$(jq -r '.lastShortcut.name // empty' "$SHORTCUT_FILE" 2>/dev/null || true)
      sc_used_at=$(jq -r '.lastShortcut.usedAt // 0' "$SHORTCUT_FILE" 2>/dev/null || echo 0)
      sc_context=$(jq -r '.lastShortcut.context // empty' "$SHORTCUT_FILE" 2>/dev/null || true)
    fi

    if [[ -n "$sc_name" && "$sc_used_at" -gt 0 ]]; then
      has_content=true
      local now
      now=$(date +%s)
      local elapsed=$((now - sc_used_at / 1000))
      if [[ $elapsed -lt 0 ]]; then elapsed=0; fi

      local ago=""
      if [[ $elapsed -lt 60 ]]; then
        ago="${elapsed}s ago"
      elif [[ $elapsed -lt 3600 ]]; then
        ago="$((elapsed / 60))m ago"
      else
        ago="$((elapsed / 3600))h ago"
      fi

      local line="  ${C_CYAN}#${sc_name}${C_RESET} ${C_DIM}${ago}${C_RESET}"
      if [[ -n "$sc_context" ]]; then
        local max_ctx=$((width - ${#sc_name} - ${#ago} - 8))
        if [[ $max_ctx -gt 3 ]]; then
          if [[ ${#sc_context} -gt $max_ctx ]]; then
            sc_context="${sc_context:0:$((max_ctx - 2))}.."
          fi
          line="  ${C_CYAN}#${sc_name}${C_RESET} ${C_DIM}${sc_context} · ${ago}${C_RESET}"
        fi
      fi
      echo -e "$line"
    fi
  fi

  if [[ "$has_content" == false ]]; then
    echo -e "  ${C_DIM}none${C_RESET}"
  fi
}

# ── Todo Section ─────────────────────────────────────────

render_todo() {
  local width="$1"

  echo ""
  echo -e "  ${C_BOLD}${C_GREEN}TODO${C_RESET}"

  if [[ ! -f "$TODO_FILE" ]]; then
    echo -e "  ${C_DIM}No tasks${C_RESET}"
    return
  fi

  local count=0 completed=0
  local lines=()

  if command -v jq &>/dev/null; then
    count=$(jq -r '.tasks | length' "$TODO_FILE" 2>/dev/null || echo 0)
    completed=$(jq -r '[.tasks[] | select(.status == "completed")] | length' "$TODO_FILE" 2>/dev/null || echo 0)

    while IFS=$'\t' read -r id subject status activeForm; do
      [[ -z "$id" ]] && continue
      local symbol color label
      case "$status" in
        completed) symbol="$S_DONE"; color="$C_GREEN"; label="$subject" ;;
        in_progress) symbol="$S_ACTIVE"; color="$C_YELLOW"; label="${activeForm:-$subject}" ;;
        *) symbol="$S_PENDING"; color="$C_DIM"; label="$subject" ;;
      esac

      local max_label=$((width - 8))
      if [[ ${#label} -gt $max_label ]]; then
        label="${label:0:$((max_label - 2))}.."
      fi

      lines+=("$(printf "  ${color}${symbol} %s. %s${C_RESET}" "$id" "$label")")
    done < <(jq -r '.tasks[] | [.id, .subject, .status, (.activeForm // "")] | @tsv' "$TODO_FILE" 2>/dev/null)
  else
    # Node fallback
    local node_bin=""
    if command -v node &>/dev/null; then node_bin="node"
    elif [[ -x "$HOME/.volta/bin/node" ]]; then node_bin="$HOME/.volta/bin/node"
    elif [[ -x "$HOME/.nvm/current/bin/node" ]]; then node_bin="$HOME/.nvm/current/bin/node"
    fi
    if [[ -n "$node_bin" ]]; then
      local parsed
      parsed=$("$node_bin" -e "
        const d=JSON.parse(require('fs').readFileSync('$TODO_FILE','utf-8'));
        const t=d.tasks||[];
        console.log(t.length);
        console.log(t.filter(x=>x.status==='completed').length);
        t.forEach(x=>console.log([x.id,x.subject,x.status,x.activeForm||''].join('\t')));
      " 2>/dev/null) || true
      if [[ -n "$parsed" ]]; then
        local i=0
        while IFS= read -r line; do
          if [[ $i -eq 0 ]]; then count="$line"
          elif [[ $i -eq 1 ]]; then completed="$line"
          else
            IFS=$'\t' read -r id subject status activeForm <<< "$line"
            local symbol color label
            case "$status" in
              completed) symbol="$S_DONE"; color="$C_GREEN"; label="$subject" ;;
              in_progress) symbol="$S_ACTIVE"; color="$C_YELLOW"; label="${activeForm:-$subject}" ;;
              *) symbol="$S_PENDING"; color="$C_DIM"; label="$subject" ;;
            esac
            local max_label=$((width - 8))
            if [[ ${#label} -gt $max_label ]]; then
              label="${label:0:$((max_label - 2))}.."
            fi
            lines+=("$(printf "  ${color}${symbol} %s. %s${C_RESET}" "$id" "$label")")
          fi
          ((i++))
        done <<< "$parsed"
      fi
    fi
  fi

  if [[ ${#lines[@]} -eq 0 ]]; then
    echo -e "  ${C_DIM}No tasks${C_RESET}"
  else
    for line in "${lines[@]}"; do
      echo -e "$line"
    done
  fi

  # Progress bar
  if [[ $count -gt 0 ]]; then
    local bar_len=$((width - 8))
    if [[ $bar_len -lt 5 ]]; then bar_len=5; fi
    local filled=$(( (completed * bar_len) / count ))
    local empty=$((bar_len - filled))

    local bar_filled="" bar_empty=""
    for ((i=0; i<filled; i++)); do bar_filled+="━"; done
    for ((i=0; i<empty; i++)); do bar_empty+="░"; done

    echo -e "  ${C_GREEN}${bar_filled}${C_RESET}${C_DIM}${bar_empty}${C_RESET}  ${completed}/${count}"
  fi
}

# ── Git Diff Section ─────────────────────────────────────

render_git() {
  local width="$1"

  echo ""
  echo -e "  ${C_BOLD}${C_CYAN}GIT DIFF${C_RESET}"

  # Cache git output for 5 seconds
  local now
  now=$(date +%s)
  if [[ $((now - git_cache_time)) -ge 5 || -z "$git_cache" ]]; then
    git_cache=$(cd "$CWD" && git diff --numstat HEAD 2>/dev/null || true)
    git_cache_time=$now
  fi

  if [[ -z "$git_cache" ]]; then
    echo -e "  ${C_DIM}Clean${C_RESET}"
    return
  fi

  # Count files
  local file_count=0
  file_count=$(echo "$git_cache" | grep -c '.' || true)
  echo -e "  ${C_DIM}${file_count} files changed${C_RESET}"
  echo ""

  # Per-file stats: numstat format is "added\tremoved\tfilename"
  # Layout per row: "  [fname][gap][stat]" — fname expands to fill available space
  # row_usable = width - 2(indent) - 1(min gap) = width - 3

  local row_usable=$((width - 4))

  while IFS=$'\t' read -r added removed fname; do
    [[ -z "$fname" ]] && continue

    # Build stat string to measure its length
    local stat=""
    [[ "$added" != "0" && "$added" != "-" ]] && stat="+${added}"
    if [[ "$removed" != "0" && "$removed" != "-" ]]; then
      [[ -n "$stat" ]] && stat+=" "
      stat+="-${removed}"
    fi
    local stat_len=${#stat}

    # fname gets remaining space
    local fname_col=$((row_usable - stat_len))
    if [[ $fname_col -lt 4 ]]; then fname_col=4; fi

    # Truncate fname from right
    if [[ ${#fname} -gt $fname_col ]]; then
      fname="${fname:0:$((fname_col - 2))}.."
    fi

    # Manually pad fname with spaces (avoid printf ANSI interaction)
    local fname_padded="$fname"
    local fname_pad=$((fname_col - ${#fname}))
    if [[ $fname_pad -gt 0 ]]; then
      fname_padded+=$(printf '%*s' "$fname_pad" "")
    fi

    # Build line: indent + dim fname + space + colored stat
    local line="  ${C_DIM}${fname_padded}${C_RESET} "
    if [[ "$added" != "0" && "$added" != "-" ]]; then
      line+="${C_GREEN}+${added}${C_RESET}"
      [[ "$removed" != "0" && "$removed" != "-" ]] && line+=" "
    fi
    if [[ "$removed" != "0" && "$removed" != "-" ]]; then
      line+="${C_RED}-${removed}${C_RESET}"
    fi
    echo -e "$line"
  done <<< "$git_cache"
}

# ── Main Render ──────────────────────────────────────────

render() {
  local width
  # Pane is always created with -l 40; tput cols is unreliable at startup
  # Cap at 40 to prevent wrapping, then subtract margin
  width=$(get_width)
  if [[ $width -gt 40 ]]; then width=40; fi
  width=$((width - 3))

  clear

  # Title
  echo ""
  echo -e "  ${C_BOLD}${C_CYAN}not-my-reforge${C_RESET} ${C_DIM}v${VERSION}${C_RESET}"

  # Sections
  render_shortcut "$width"
  echo ""
  print_separator "$width"
  render_todo "$width"
  echo ""
  print_separator "$width"
  render_git "$width"
  echo ""
}

# ── Poll Loop ────────────────────────────────────────────

compute_hash() {
  local h=""
  if [[ -f "$TODO_FILE" ]]; then
    h+=$(md5 -q "$TODO_FILE" 2>/dev/null || md5sum "$TODO_FILE" 2>/dev/null | cut -d' ' -f1 || echo "t")
  fi
  if [[ -f "$MODE_FILE" ]]; then
    h+=$(md5 -q "$MODE_FILE" 2>/dev/null || md5sum "$MODE_FILE" 2>/dev/null | cut -d' ' -f1 || echo "m")
  fi
  if [[ -f "$SHORTCUT_FILE" ]]; then
    h+=$(md5 -q "$SHORTCUT_FILE" 2>/dev/null || md5sum "$SHORTCUT_FILE" 2>/dev/null | cut -d' ' -f1 || echo "s")
  fi
  # git diff changes are detected by the 5s cache refresh, not hashing
  echo "$h"
}

# Initial render
render

while true; do
  current_hash=$(compute_hash)

  # Re-render if data files changed OR every 5s (for git diff refresh)
  now_ts=$(date +%s)
  since_git=$((now_ts - git_cache_time))

  if [[ "$current_hash" != "$last_hash" || $since_git -ge 5 ]]; then
    render
    last_hash="$current_hash"
  fi

  sleep 2
done
