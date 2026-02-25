#!/usr/bin/env bash
# todo-pane.sh — Render todo-state.json in a tmux side pane
# Usage: bash todo-pane.sh <project-cwd>
# Polls .reforge/todo-state.json every 1s, re-renders on change

set -euo pipefail

CWD="${1:-.}"
TODO_FILE="${CWD}/.reforge/todo-state.json"

# Colors
C_RESET="\033[0m"
C_GREEN="\033[32m"
C_YELLOW="\033[33m"
C_DIM="\033[2m"
C_BOLD="\033[1m"
C_CYAN="\033[36m"

# Symbols
S_DONE="✓"
S_ACTIVE="◆"
S_PENDING="○"

last_hash=""

render() {
  local file="$1"

  if [[ ! -f "$file" ]]; then
    clear
    echo -e "\n  ${C_DIM}Waiting for tasks...${C_RESET}\n"
    return
  fi

  # Read JSON — try jq first, fallback to node
  local json
  if command -v jq &>/dev/null; then
    json=$(cat "$file")
  else
    json=$(cat "$file")
  fi

  # Parse with jq or node
  local count=0
  local completed=0
  local lines=()

  if command -v jq &>/dev/null; then
    count=$(echo "$json" | jq -r '.tasks | length')
    completed=$(echo "$json" | jq -r '[.tasks[] | select(.status == "completed")] | length')

    while IFS=$'\t' read -r id subject status activeForm; do
      local symbol color label
      case "$status" in
        completed)
          symbol="$S_DONE"
          color="$C_GREEN"
          label="$subject"
          ;;
        in_progress)
          symbol="$S_ACTIVE"
          color="$C_YELLOW"
          label="${activeForm:-$subject}"
          ;;
        *)
          symbol="$S_PENDING"
          color="$C_DIM"
          label="$subject"
          ;;
      esac

      # Truncate long labels to fit pane width (max 28 chars for label)
      if [[ ${#label} -gt 28 ]]; then
        label="${label:0:26}.."
      fi

      lines+=("$(printf "  ${color}${symbol} %s. %s${C_RESET}" "$id" "$label")")
    done < <(echo "$json" | jq -r '.tasks[] | [.id, .subject, .status, (.activeForm // "")] | @tsv')
  else
    # Node.js fallback
    local node_bin=""
    if command -v node &>/dev/null; then
      node_bin="node"
    elif [[ -x "/usr/local/bin/node" ]]; then
      node_bin="/usr/local/bin/node"
    elif [[ -x "$HOME/.nvm/current/bin/node" ]]; then
      node_bin="$HOME/.nvm/current/bin/node"
    elif [[ -x "$HOME/.volta/bin/node" ]]; then
      node_bin="$HOME/.volta/bin/node"
    fi

    if [[ -z "$node_bin" ]]; then
      echo -e "\n  ${C_DIM}jq or node required${C_RESET}\n"
      return
    fi

    local parsed
    parsed=$("$node_bin" -e "
      const d = JSON.parse(require('fs').readFileSync('$file','utf-8'));
      const tasks = d.tasks || [];
      console.log(tasks.length);
      console.log(tasks.filter(t => t.status === 'completed').length);
      tasks.forEach(t => console.log([t.id, t.subject, t.status, t.activeForm || ''].join('\t')));
    " 2>/dev/null) || return

    local i=0
    while IFS= read -r line; do
      if [[ $i -eq 0 ]]; then
        count="$line"
      elif [[ $i -eq 1 ]]; then
        completed="$line"
      else
        IFS=$'\t' read -r id subject status activeForm <<< "$line"
        local symbol color label
        case "$status" in
          completed)
            symbol="$S_DONE"
            color="$C_GREEN"
            label="$subject"
            ;;
          in_progress)
            symbol="$S_ACTIVE"
            color="$C_YELLOW"
            label="${activeForm:-$subject}"
            ;;
          *)
            symbol="$S_PENDING"
            color="$C_DIM"
            label="$subject"
            ;;
        esac

        if [[ ${#label} -gt 28 ]]; then
          label="${label:0:26}.."
        fi

        lines+=("$(printf "  ${color}${symbol} %s. %s${C_RESET}" "$id" "$label")")
      fi
      ((i++))
    done <<< "$parsed"
  fi

  # Get pane width for box drawing
  local width
  width=$(tput cols 2>/dev/null || echo 34)
  if [[ $width -lt 20 ]]; then width=34; fi

  local inner=$((width - 2))

  # Build progress bar
  local bar_len=$((inner - 8))
  if [[ $bar_len -lt 5 ]]; then bar_len=5; fi

  local filled=0
  if [[ $count -gt 0 ]]; then
    filled=$(( (completed * bar_len) / count ))
  fi
  local empty=$((bar_len - filled))

  local bar=""
  for ((i=0; i<filled; i++)); do bar+="━"; done
  for ((i=0; i<empty; i++)); do bar+="░"; done

  # Render
  clear

  # Top border
  local title=" reforge: todo "
  local title_len=${#title}
  local left_border=1
  local right_border=$((inner - left_border - title_len))
  if [[ $right_border -lt 1 ]]; then right_border=1; fi

  printf "${C_CYAN}╭"
  printf '─%.0s' $(seq 1 $left_border)
  printf "${C_BOLD}%s${C_RESET}${C_CYAN}" "$title"
  printf '─%.0s' $(seq 1 $right_border)
  printf "╮${C_RESET}\n"

  # Empty line
  printf "${C_CYAN}│${C_RESET}%*s${C_CYAN}│${C_RESET}\n" "$inner" ""

  # Task lines
  for line in "${lines[@]}"; do
    # Print line with right border padding
    printf "${C_CYAN}│${C_RESET}"
    echo -ne "$line"
    # Calculate visible length (strip ANSI) for padding
    local visible
    visible=$(echo -e "$line" | sed 's/\x1b\[[0-9;]*m//g')
    local pad=$((inner - ${#visible}))
    if [[ $pad -gt 0 ]]; then
      printf "%*s" "$pad" ""
    fi
    printf "${C_CYAN}│${C_RESET}\n"
  done

  # Empty line
  printf "${C_CYAN}│${C_RESET}%*s${C_CYAN}│${C_RESET}\n" "$inner" ""

  # Progress bar
  local progress_line="  ${bar}  ${completed}/${count}"
  printf "${C_CYAN}│${C_RESET}  ${C_GREEN}%s${C_RESET}${C_DIM}%s${C_RESET}  %d/%d" \
    "$(printf '━%.0s' $(seq 1 $filled 2>/dev/null) 2>/dev/null)" \
    "$(printf '░%.0s' $(seq 1 $empty 2>/dev/null) 2>/dev/null)" \
    "$completed" "$count"

  # Pad progress line
  local prog_visible="  $(printf '━%.0s' $(seq 1 $filled 2>/dev/null) 2>/dev/null)$(printf '░%.0s' $(seq 1 $empty 2>/dev/null) 2>/dev/null)  ${completed}/${count}"
  local prog_pad=$((inner - ${#prog_visible}))
  if [[ $prog_pad -gt 0 ]]; then
    printf "%*s" "$prog_pad" ""
  fi
  printf "${C_CYAN}│${C_RESET}\n"

  # Bottom border
  printf "${C_CYAN}╰"
  printf '─%.0s' $(seq 1 $inner)
  printf "╯${C_RESET}\n"
}

# Main loop — poll and re-render on change
while true; do
  if [[ -f "$TODO_FILE" ]]; then
    current_hash=$(md5 -q "$TODO_FILE" 2>/dev/null || md5sum "$TODO_FILE" 2>/dev/null | cut -d' ' -f1 || echo "none")
  else
    current_hash="none"
  fi

  if [[ "$current_hash" != "$last_hash" ]]; then
    render "$TODO_FILE"
    last_hash="$current_hash"
  fi

  sleep 1
done
