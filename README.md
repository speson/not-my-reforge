# not-my-reforge

![not-my-reforge](plugins/not-my-reforge/assets/banner.png)

*not oh-my. reforged.*

AI agent orchestration, quality hooks, and smart routing for Claude Code — reforged from oh-my-opencode and oh-my-claudecode.

## Install

```bash
claude plugin marketplace add https://github.com/speson/not-my-reforge
claude plugin install not-my-reforge
```

For the best experience (todo pane, parallel execution), run inside tmux:

```bash
tmux new-session "claude"
```

<details>
<summary>Local development</summary>

```bash
git clone https://github.com/speson/not-my-reforge
cd plugins/not-my-reforge && npm install && npm run build

# Run inside tmux for full feature support
tmux new-session "claude --plugin-dir ./plugins/not-my-reforge"
```

> **Note:** When developing this plugin itself, always use `--plugin-dir` to point at
> the local source. The installed version (`~/.claude/plugins/cache/...`) is a separate
> copy — edits to the repo won't take effect until you reinstall or use this flag.
> Using `--plugin-dir` also ensures hooks run against your latest build, avoiding
> stale-cache issues like the verification gate running outdated code.
</details>

## Quick Start

```bash
#orch implement auth, profiles, and notifications   # Smart orchestration
reforge quick fix the typo in header                 # Fast (haiku)
reforge deep refactor the authentication module      # Deep (opus)
/not-my-reforge:diff-review                          # 5-perspective review
#search UserService                                  # DeepSearch
```

## Orchestration Modes

7 modes — or let `#orch` auto-select:

| Mode | Command | Best For |
|------|---------|----------|
| **Ralph Loop** | `reforge loop <task>` | Iterative refinement until success |
| **Autopilot** | `reforge autopilot <goal>` | Sequential multi-task automation |
| **Pipeline** | `reforge pipeline <goal>` | Quality gates: plan → implement → verify → fix → review |
| **Team** | `reforge team N <task>` | Parallel workers + worktree isolation |
| **Swarm** | `reforge swarm <goal>` | Parallel research and analysis |
| **QA Loop** | `reforge qa <target>` | Auto test → fix → retest cycle |
| **Ralplan** | `reforge ralplan <goal>` | Iterative consensus planning |

`#orch` routing:

| Pattern | Mode |
|---------|------|
| Multiple tasks (comma/and) | team |
| "fix all" + test-related | qa |
| "fix all" / `--verify` | ralph |
| Analysis / research / audit | swarm |
| Design / plan / architect | ralplan |
| Quality-critical (payment, auth) | pipeline |

```bash
reforge cancel              # cancel all modes
/not-my-reforge:mode        # check active mode
```

## Agents

**20 Core** + **5 Team** agents:

| Agent | Model | Purpose |
|-------|-------|---------|
| `oracle` / `oracle-deep` / `oracle-quick` | sonnet/opus/haiku | Architecture analysis |
| `planner` / `planner-quick` | opus/sonnet | Implementation planning |
| `reviewer` / `reviewer-quick` | sonnet/haiku | Code review |
| `security-reviewer` | opus | Security audit (OWASP Top 10) |
| `build-fixer` | sonnet | Build error specialist |
| `designer` | sonnet | UI/UX design |
| `test-engineer` | sonnet | Test suite design, TDD |
| `analyst` | opus | Requirements decomposition |
| `critic` | opus | Plan evaluation |
| `explore` | haiku | Fast codebase exploration |
| `librarian` | sonnet | Documentation research |
| `vision` | sonnet | Screenshot/mockup analysis |
| `git-master` | sonnet | Git workflow, conflicts |
| `qa-engineer` | sonnet | Auto QA loop |
| `consensus-planner` | sonnet | Plan-critique-revise cycles |
| `deepsearch` | sonnet | Multi-strategy search |

Team agents: `lead`, `worker`, `researcher`, `tester`, `reviewer-teammate`

## Commands

| | Command | Purpose |
|---|---------|---------|
| **Workflow** | `quick` `deep` `visual` `review` `diff-review` `init` `deepinit` `handoff` | Task execution and project setup |
| **Orchestration** | `loop` `spawn` `autopilot` `pipeline` `team` `swarm` `qa` `ralplan` | Multi-step automation |
| **DevOps** | `pr` `release` `status` `history` `mode` `notify` `doctor` | Git, metrics, diagnostics |

All commands prefixed with `/not-my-reforge:` (e.g. `/not-my-reforge:quick`)

## Keywords & Shortcuts

**Keywords** (type directly):

| Keyword | Effect |
|---------|--------|
| `reforge deep/quick <task>` | Model routing |
| `reforge review/analyze/critique/security` | Specialized analysis |
| `reforge parallel <task>` | Parallel subtask execution |
| `reforge cancel [target]` | Cancel active mode |

**Shortcuts** (`#` prefix, anywhere in prompt — shows `[#shortcut]` confirmation on match):

| Shortcut | Effect |
|----------|--------|
| `#orch [task]` | Smart orchestration |
| `#verify` | Quality gate checks |
| `#search <query>` | DeepSearch (5 strategies) |
| `#review [base]` | Multi-perspective review |
| `#qa [target]` | Auto QA loop |
| `#team` | Team status |
| `#status` | Session metrics |
| `#memo [text]` | Session notes (`!` = critical) |

## Hooks

40 automatic hooks across 5 categories:

| Category | Hooks | Highlights |
|----------|-------|------------|
| **Safety** | write-guard, comment-checker, edit-safety, non-interactive-guard, intent-gate, mode-guard | Block overwrites, AI slop, destructive commands |
| **Verification** | verification-gate, todo-enforcer, deliverable-check | Quality checks on Stop |
| **Intelligence** | project-memory, learner, task-sizer, context-monitor, failure-tracker | Auto-detect stack, learn patterns, circuit breaker |
| **Orchestration** | ralph-\*, autopilot-\*, pipeline-\*, swarm-\*, cancel-handler, teammate-idle, task-completed | Mode lifecycle management |
| **Observability** | metrics-collector, subagent-tracker, hud-update, todo-tracker, notify-completion, session-\*, shutdown-protocol, code-simplifier | Tracking, notifications, cleanup |

## Skills

| Skill | Purpose |
|-------|---------|
| `project-awareness` (auto) | Tech stack detection and memory |
| `team-pipeline` | 5-stage quality pipeline with Agent Teams |
| `deepsearch` | Multi-strategy parallel codebase search |

## Notifications

```bash
/not-my-reforge:notify add discord <webhook_url>
/not-my-reforge:notify add slack <webhook_url>
/not-my-reforge:notify add telegram <bot_token>:<chat_id>
```

## Todo Pane

When Claude creates tasks (TaskCreate/TaskUpdate), a tmux side pane opens automatically to display real-time progress:

```
╭─ reforge: todo ─────────────╮
│                              │
│  ✓ 1. Set up database schema │
│  ◆ 2. Implement auth API     │
│  ○ 3. Add unit tests         │
│                              │
│  ━━━━━━━━━━░░░░░░░░░░  1/3  │
╰──────────────────────────────╯
```

Requires tmux. Silently skipped outside tmux sessions.

## Parallel Execution

```bash
# tmux — shared workdir
bash scripts/tmux-spawn.sh "session" "task1" "task2" "task3"

# tmux — git worktree isolation
bash scripts/tmux-spawn-worktree.sh "session" "task1" "task2" "task3"

# Agent Teams (requires CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1)
reforge team 3 implement auth, profiles, notifications
```

## Project Structure

```
not-my-reforge/
├── .claude-plugin/marketplace.json    # Marketplace manifest
├── plugins/
│   └── not-my-reforge/               # Plugin root
│       ├── .claude-plugin/plugin.json
│       ├── agents/                    # 25 agents (20 core + 5 team)
│       ├── commands/                  # 23 slash commands
│       ├── hooks/hooks.json           # 39 hook definitions
│       ├── skills/                    # 3 skills
│       ├── scripts/                   # tmux, HUD, merge
│       ├── src/                       # TypeScript source
│       ├── dist/                      # Compiled JS (pre-built)
│       ├── package.json
│       └── CLAUDE.md
├── .gitignore
└── README.md
```

## Requirements

- Claude Code CLI
- Node.js >= 18
- `tmux` (optional, for parallel execution)
- `git` (for worktree isolation)

## License

MIT
