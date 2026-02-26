#!/usr/bin/env bash
# sidebar-pane.sh — Unified sidebar: Shortcut + Todo + File Changes
# Usage: bash sidebar-pane.sh <project-cwd>
# Polls data sources every 2s, re-renders on change

set -euo pipefail

CWD="${1:-.}"
TODO_FILE="${CWD}/.reforge/todo-state.json"
MODE_FILE="${CWD}/.reforge/mode-registry.json"
SHORTCUT_FILE="${CWD}/.reforge/shortcut-state.json"
METRICS_FILE="${CWD}/.reforge/session-metrics.json"
PIPELINE_FILE="${CWD}/.reforge/pipeline-state.json"
AUTOPILOT_FILE="${CWD}/.reforge/autopilot-state.json"
TEAM_FILE="${CWD}/.reforge/team-state.json"

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
no_claude_count=0

# Read version from package.json
PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$CWD}"
VERSION=""
if command -v jq &>/dev/null; then
  VERSION=$(jq -r '.version // "0.0.0"' "$PLUGIN_ROOT/package.json" 2>/dev/null || echo "0.0.0")
else
  VERSION=$(sed -n 's/.*"version".*"\(.*\)".*/\1/p' "$PLUGIN_ROOT/package.json" 2>/dev/null | head -1)
  [[ -z "$VERSION" ]] && VERSION="0.0.0"
fi

# PANE_TITLE must match sidebar-open.ts
PANE_TITLE="reforge-sidebar"

# ── Helpers ──────────────────────────────────────────────

# When Claude exits, sibling pane reverts to shell (bash/zsh)
is_claude_alive() {
  while IFS='|' read -r ptitle pcmd; do
    [[ "$ptitle" == "$PANE_TITLE" ]] && continue
    case "$pcmd" in
      bash|zsh|sh|fish|-bash|-zsh|"") ;;
      *) return 0 ;;
    esac
  done < <(tmux list-panes -F '#{pane_title}|#{pane_current_command}' 2>/dev/null)
  return 1
}

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

# ── Phase Section ────────────────────────────────────────

render_phase() {
  local width="$1"
  local has_phase=false

  # Pipeline: plan → implement → verify → fix → review → done
  if [[ -f "$PIPELINE_FILE" ]]; then
    local p_active="" p_stage="" p_goal=""
    if command -v jq &>/dev/null; then
      p_active=$(jq -r '.active // false' "$PIPELINE_FILE" 2>/dev/null || echo "false")
      p_stage=$(jq -r '.currentStage // empty' "$PIPELINE_FILE" 2>/dev/null || true)
      p_goal=$(jq -r '.goal // empty' "$PIPELINE_FILE" 2>/dev/null || true)
    fi
    if [[ "$p_active" == "true" && -n "$p_stage" ]]; then
      has_phase=true
      echo -e "  ${C_YELLOW}Pipeline${C_RESET}"
      local stages=("plan" "implement" "verify" "fix" "review" "done")
      render_stage_bar "$width" "$p_stage" "${stages[@]}"
      if [[ -n "$p_goal" ]]; then
        local max_goal=$((width - 4))
        if [[ ${#p_goal} -gt $max_goal ]]; then
          p_goal="${p_goal:0:$((max_goal - 2))}.."
        fi
        echo -e "  ${C_DIM}${p_goal}${C_RESET}"
      fi
    fi
  fi

  # Autopilot: planning → executing → verifying → completed
  if [[ -f "$AUTOPILOT_FILE" ]]; then
    local a_active="" a_phase="" a_goal="" a_done=0 a_total=0
    if command -v jq &>/dev/null; then
      a_active=$(jq -r '.active // false' "$AUTOPILOT_FILE" 2>/dev/null || echo "false")
      a_phase=$(jq -r '.phase // empty' "$AUTOPILOT_FILE" 2>/dev/null || true)
      a_goal=$(jq -r '.goal // empty' "$AUTOPILOT_FILE" 2>/dev/null || true)
      a_done=$(jq -r '[.tasks[]? | select(.status == "done")] | length' "$AUTOPILOT_FILE" 2>/dev/null || echo 0)
      a_total=$(jq -r '.tasks | length' "$AUTOPILOT_FILE" 2>/dev/null || echo 0)
    fi
    if [[ "$a_active" == "true" && -n "$a_phase" ]]; then
      [[ "$has_phase" == true ]] && echo ""
      has_phase=true
      echo -e "  ${C_YELLOW}Autopilot${C_RESET} ${C_DIM}${a_done}/${a_total}${C_RESET}"
      local stages=("planning" "executing" "verifying" "completed")
      render_stage_bar "$width" "$a_phase" "${stages[@]}"
      if [[ -n "$a_goal" ]]; then
        local max_goal=$((width - 4))
        if [[ ${#a_goal} -gt $max_goal ]]; then
          a_goal="${a_goal:0:$((max_goal - 2))}.."
        fi
        echo -e "  ${C_DIM}${a_goal}${C_RESET}"
      fi
    fi
  fi

  # Team: planning → executing → reviewing → merging → done
  if [[ -f "$TEAM_FILE" ]]; then
    local t_active="" t_stage="" t_desc="" t_done=0 t_total=0
    if command -v jq &>/dev/null; then
      t_active=$(jq -r '.active // false' "$TEAM_FILE" 2>/dev/null || echo "false")
      t_stage=$(jq -r '.stage // empty' "$TEAM_FILE" 2>/dev/null || true)
      t_desc=$(jq -r '.taskDescription // empty' "$TEAM_FILE" 2>/dev/null || true)
      t_done=$(jq -r '[.workers[]? | select(.status == "done")] | length' "$TEAM_FILE" 2>/dev/null || echo 0)
      t_total=$(jq -r '.workers | length' "$TEAM_FILE" 2>/dev/null || echo 0)
    fi
    if [[ "$t_active" == "true" && -n "$t_stage" ]]; then
      [[ "$has_phase" == true ]] && echo ""
      has_phase=true
      echo -e "  ${C_YELLOW}Team${C_RESET} ${C_DIM}${t_done}/${t_total} workers${C_RESET}"
      local stages=("planning" "executing" "reviewing" "merging" "done")
      render_stage_bar "$width" "$t_stage" "${stages[@]}"
      if [[ -n "$t_desc" ]]; then
        local max_desc=$((width - 4))
        if [[ ${#t_desc} -gt $max_desc ]]; then
          t_desc="${t_desc:0:$((max_desc - 2))}.."
        fi
        echo -e "  ${C_DIM}${t_desc}${C_RESET}"
      fi
    fi
  fi

  if [[ "$has_phase" == false ]]; then
    return 1  # signal: no phase rendered
  fi
}

# Render a horizontal stage indicator
# Usage: render_stage_bar <width> <current_stage> <stage1> <stage2> ...
render_stage_bar() {
  local width="$1"
  local current="$2"
  shift 2
  local stages=("$@")
  local stage_count=${#stages[@]}
  local current_idx=-1

  for ((i=0; i<stage_count; i++)); do
    if [[ "${stages[$i]}" == "$current" ]]; then
      current_idx=$i
      break
    fi
  done

  local line="  "
  for ((i=0; i<stage_count; i++)); do
    local name="${stages[$i]}"
    # Abbreviate long stage names to fit 40-col pane
    case "$name" in
      implement*)  name="impl" ;;
      executing)   name="exec" ;;
      verifying|verify) name="vfy" ;;
      planning)    name="plan" ;;
      reviewing|review) name="rvw" ;;
      completed)   name="done" ;;
      merging)     name="mrg" ;;
    esac

    if [[ $i -lt $current_idx ]]; then
      line+="${C_GREEN}${S_DONE}${C_RESET}"
    elif [[ $i -eq $current_idx ]]; then
      line+="${C_YELLOW}${S_ACTIVE}${name}${C_RESET}"
    else
      line+="${C_DIM}${S_PENDING}${C_RESET}"
    fi

    if [[ $i -lt $((stage_count - 1)) ]]; then
      line+="${C_DIM}─${C_RESET}"
    fi
  done

  echo -e "$line"
}

# ── Todo Section ─────────────────────────────────────────

render_todo() {
  local width="$1"

  echo ""
  echo -e "  ${C_BOLD}${C_GREEN}TODO${C_RESET}"

  # Phase info (shown above task list)
  if render_phase "$width"; then
    echo ""
  fi

  # Task list
  local count=0 completed=0
  local lines=()

  if [[ -f "$TODO_FILE" ]]; then
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

# ── File Changes Section ─────────────────────────────────

render_file_changes() {
  local width="$1"

  echo ""
  echo -e "  ${C_BOLD}${C_CYAN}FILE CHANGES${C_RESET}"

  if [[ ! -f "$METRICS_FILE" ]]; then
    echo -e "  ${C_DIM}No changes${C_RESET}"
    return
  fi

  # 1) Read session filesModified (absolute paths → relative)
  local session_files=()
  if command -v jq &>/dev/null; then
    while IFS= read -r fpath; do
      [[ -z "$fpath" ]] && continue
      if [[ "$fpath" == "$CWD/"* ]]; then
        fpath="${fpath#$CWD/}"
      fi
      session_files+=("$fpath")
    done < <(jq -r '.filesModified[]? // empty' "$METRICS_FILE" 2>/dev/null)
  else
    local node_bin=""
    if command -v node &>/dev/null; then node_bin="node"
    elif [[ -x "$HOME/.volta/bin/node" ]]; then node_bin="$HOME/.volta/bin/node"
    elif [[ -x "$HOME/.nvm/current/bin/node" ]]; then node_bin="$HOME/.nvm/current/bin/node"
    fi
    if [[ -n "$node_bin" ]]; then
      while IFS= read -r fpath; do
        [[ -z "$fpath" ]] && continue
        if [[ "$fpath" == "$CWD/"* ]]; then
          fpath="${fpath#$CWD/}"
        fi
        session_files+=("$fpath")
      done < <("$node_bin" -e "
        const d=JSON.parse(require('fs').readFileSync('$METRICS_FILE','utf-8'));
        (d.filesModified||[]).forEach(f=>console.log(f));
      " 2>/dev/null)
    fi
  fi

  if [[ ${#session_files[@]} -eq 0 ]]; then
    echo -e "  ${C_DIM}No changes${C_RESET}"
    return
  fi

  # 2) Get git diff stats (staged + unstaged vs HEAD)
  #    Format: "added\tdeleted\tfilepath" per line
  local git_diff=""
  git_diff=$(cd "$CWD" && git diff HEAD --numstat 2>/dev/null || true)
  local git_diff_cached=""
  git_diff_cached=$(cd "$CWD" && git diff --cached --numstat 2>/dev/null || true)

  # Merge into a single lookup string (newline-separated "add\tdel\tpath")
  local all_diff="${git_diff}"$'\n'"${git_diff_cached}"

  # 3) Intersect: for each session file, find its diff stats
  local display_files=() display_adds=() display_dels=()
  local total_add=0 total_del=0

  for sf in "${session_files[@]}"; do
    local best_add=0 best_del=0
    while IFS=$'\t' read -r added deleted fpath; do
      [[ -z "$fpath" ]] && continue
      if [[ "$fpath" == "$sf" ]]; then
        [[ "$added" == "-" ]] && added=0
        [[ "$deleted" == "-" ]] && deleted=0
        [[ $added -gt $best_add ]] && best_add=$added
        [[ $deleted -gt $best_del ]] && best_del=$deleted
      fi
    done <<< "$all_diff"

    if [[ $best_add -gt 0 || $best_del -gt 0 ]]; then
      display_files+=("$sf")
      display_adds+=("$best_add")
      display_dels+=("$best_del")
      total_add=$((total_add + best_add))
      total_del=$((total_del + best_del))
    fi
  done

  if [[ ${#display_files[@]} -eq 0 ]]; then
    echo -e "  ${C_DIM}No uncommitted changes${C_RESET}"
    return
  fi

  echo -e "  ${C_DIM}${#display_files[@]} file(s)${C_RESET}  ${C_GREEN}+${total_add}${C_RESET} ${C_RED}-${total_del}${C_RESET}"
  echo ""

  local stat_width=12  # " +NNN -NNN"
  local max_name=$((width - stat_width - 2))

  for ((idx=0; idx<${#display_files[@]}; idx++)); do
    local fname="${display_files[$idx]}"
    local a="${display_adds[$idx]}"
    local d="${display_dels[$idx]}"

    local color="$C_DIM"
    case "$fname" in
      *.ts|*.tsx) color="$C_CYAN" ;;
      *.js|*.jsx) color="$C_YELLOW" ;;
      *.sh)       color="$C_GREEN" ;;
      *.md)       color="$C_MAGENTA" ;;
      *.json)     color="$C_DIM" ;;
    esac

    local display="$fname"
    if [[ ${#display} -gt $max_name ]]; then
      display="..${display: -$((max_name - 2))}"
    fi

    local stat=""
    if [[ $a -gt 0 && $d -gt 0 ]]; then
      stat="${C_GREEN}+${a}${C_RESET} ${C_RED}-${d}${C_RESET}"
    elif [[ $a -gt 0 ]]; then
      stat="${C_GREEN}+${a}${C_RESET}"
    elif [[ $d -gt 0 ]]; then
      stat="${C_RED}-${d}${C_RESET}"
    fi

    echo -e "  ${color}${display}${C_RESET} ${stat}"
  done
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
  render_file_changes "$width"
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
  if [[ -f "$METRICS_FILE" ]]; then
    h+=$(md5 -q "$METRICS_FILE" 2>/dev/null || md5sum "$METRICS_FILE" 2>/dev/null | cut -d' ' -f1 || echo "f")
  fi
  if [[ -f "$PIPELINE_FILE" ]]; then
    h+=$(md5 -q "$PIPELINE_FILE" 2>/dev/null || md5sum "$PIPELINE_FILE" 2>/dev/null | cut -d' ' -f1 || echo "p")
  fi
  if [[ -f "$AUTOPILOT_FILE" ]]; then
    h+=$(md5 -q "$AUTOPILOT_FILE" 2>/dev/null || md5sum "$AUTOPILOT_FILE" 2>/dev/null | cut -d' ' -f1 || echo "a")
  fi
  if [[ -f "$TEAM_FILE" ]]; then
    h+=$(md5 -q "$TEAM_FILE" 2>/dev/null || md5sum "$TEAM_FILE" 2>/dev/null | cut -d' ' -f1 || echo "w")
  fi
  echo "$h"
}

# Initial render
render

while true; do
  # Auto-close: signal file from sidebar-close.ts Stop hook
  if [[ -f "${CWD}/.reforge/sidebar-close-signal" ]]; then
    rm -f "${CWD}/.reforge/sidebar-close-signal"
    exit 0
  fi

  # Auto-close: sole pane or Claude process gone
  pane_count=$(tmux list-panes 2>/dev/null | wc -l | tr -d ' ')
  if [[ "$pane_count" -le 1 ]]; then
    exit 0
  fi

  if ! is_claude_alive; then
    no_claude_count=$((no_claude_count + 1))
    # Wait 2 consecutive checks (4s) to avoid false positives during restarts
    if [[ $no_claude_count -ge 2 ]]; then
      exit 0
    fi
  else
    no_claude_count=0
  fi

  current_hash=$(compute_hash)

  if [[ "$current_hash" != "$last_hash" ]]; then
    render
    last_hash="$current_hash"
  fi

  sleep 2
done
