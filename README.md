# not-my-reforge

*not oh-my. reforged.*

AI agent orchestration, quality hooks, and smart routing for Claude Code — reforged from oh-my-opencode and oh-my-claudecode.

## What This Does

not-my-reforge is a Claude Code plugin that transforms your CLI into an intelligent development environment:

- **25 Specialized Agents** — Role-separated analysts, planners, reviewers, and team workers
- **39 Quality Hooks** — Automatic code quality, safety, and workflow enforcement
- **23 Slash Commands** — Workflow automation, orchestration, and project management
- **7 Orchestration Modes** — From simple loops to full team pipelines
- **3 Skills** — Reusable capabilities (project awareness, team pipeline, deepsearch)
- **Smart Routing** — `#orch` auto-selects the optimal mode for your task
- **Project Memory** — Learns your conventions across sessions

## Install

```bash
# From a git repository
claude plugin install https://github.com/speson/not-my-reforge

# Or local development
claude --plugin-dir /path/to/not-my-reforge
```

## Quick Start

```bash
# Smart orchestration — auto-selects mode + executes
#orch implement auth, profiles, and notifications

# Simple task — auto-routes to haiku
reforge quick fix the typo in header

# Complex task — auto-routes to opus
reforge deep refactor the authentication module

# Code review (5 parallel perspectives)
/not-my-reforge:diff-review

# Search everything
/not-my-reforge:deepsearch UserService

# Iterative fix loop
reforge loop fix all TS errors --verify "npx tsc --noEmit"

# Autonomous multi-task
reforge autopilot implement CRUD for users, posts, comments

# Check mode status
/not-my-reforge:mode
```

## Orchestration Modes

The core value of not-my-reforge. Choose the right mode for your task — or let `#orch` choose for you:

| Mode | Command | Best For |
|------|---------|----------|
| **Ralph Loop** | `reforge loop <task>` | Iterative refinement until success |
| **Autopilot** | `reforge autopilot <goal>` | Sequential multi-task automation |
| **Pipeline** | `reforge pipeline <goal>` | Single feature with quality gates (plan→implement→verify→fix→review) |
| **Team** | `reforge team N <task>` | Parallel workers + reviewer with worktree isolation |
| **Swarm** | `reforge swarm <goal>` | Parallel research and analysis |
| **QA Loop** | `reforge qa <target>` | Auto test→fix→retest cycle |
| **Ralplan** | `reforge ralplan <goal>` | Iterative consensus planning (propose→critique→revise) |

### Mode Management

```bash
# Check active mode
/not-my-reforge:mode

# Cancel active mode
reforge cancel              # cancel all
reforge cancel autopilot    # cancel specific mode

# Modes have conflict detection — you can't run ralph + autopilot simultaneously
# Cancel cooldown (30s) prevents race conditions after cancellation
```

### Examples

```bash
# Loop: fix until tests pass (max 10 attempts)
reforge loop fix all TypeScript errors --max 10 --verify "npx tsc --noEmit"

# Autopilot: autonomous multi-task with review checkpoints
reforge autopilot implement auth, profiles, notifications --max 5

# Pipeline: quality-gated feature development
reforge pipeline add payment integration

# Team: parallel implementation with 3 workers
reforge team 3 implement auth, user profiles, and notifications

# Swarm: parallel analysis from multiple angles
reforge swarm analyze security across the codebase --concurrency 5

# QA: auto-fix failing tests
reforge qa fix all failing tests

# Ralplan: iterative planning with self-critique
reforge ralplan redesign the database schema
```

## Agents

### Core Agents (20)

| Agent | Model | Purpose |
|-------|-------|---------|
| `oracle` | sonnet | Architecture analysis, dependency mapping, impact assessment |
| `oracle-deep` | opus | Deep architecture analysis, system design |
| `oracle-quick` | haiku | Quick architecture checks |
| `explore` | haiku | Fast codebase exploration and symbol lookup |
| `librarian` | sonnet | Documentation and OSS research |
| `planner` | opus | Deep implementation planning and task decomposition |
| `planner-quick` | sonnet | Fast implementation planning |
| `reviewer` | sonnet | Comprehensive code review |
| `reviewer-quick` | haiku | Quick code review |
| `security-reviewer` | opus | Security audit (OWASP Top 10, secrets, CVEs) |
| `build-fixer` | sonnet | Build/compilation error specialist |
| `designer` | sonnet | UI/UX design, accessibility, responsive |
| `test-engineer` | sonnet | Test suite design, TDD, coverage |
| `analyst` | opus | Requirements decomposition |
| `critic` | opus | Plan evaluation (GO / GO WITH CHANGES / RECONSIDER) |
| `vision` | sonnet | Screenshot/mockup analysis |
| `git-master` | sonnet | Git workflow, conflicts, branch strategy |
| `qa-engineer` | sonnet | Auto QA loop (test→analyze→fix→retest) |
| `consensus-planner` | sonnet | Iterative plan-critique-revise cycles |
| `deepsearch` | sonnet | Multi-strategy codebase search |

### Team Agents (5)

For use with Agent Teams (`reforge team N <task>`):

| Agent | Model | Role |
|-------|-------|------|
| `lead` | sonnet | Task decomposition, assignment, coordination |
| `worker` | sonnet | Implementation in isolated worktrees |
| `researcher` | haiku | Background research (read-only) |
| `tester` | sonnet | Test writing and execution |
| `reviewer-teammate` | sonnet | Code review for team members (read-only) |

## Commands

### Workflow

| Command | Model | Purpose |
|---------|-------|---------|
| `/not-my-reforge:quick` | haiku | Fast execution — speed over depth |
| `/not-my-reforge:deep` | opus | Deep analysis — thoroughness over speed |
| `/not-my-reforge:visual` | sonnet | Frontend/UI specialized tasks |
| `/not-my-reforge:review` | sonnet | Git diff-based code review |
| `/not-my-reforge:diff-review` | sonnet | Multi-perspective parallel review (5 viewpoints) |
| `/not-my-reforge:init` | sonnet | Auto-generate CLAUDE.md from project analysis |
| `/not-my-reforge:deepinit` | sonnet | Hierarchical AGENTS.md per directory |
| `/not-my-reforge:handoff` | sonnet | Create session handoff document |

### Orchestration

| Command | Model | Purpose |
|---------|-------|---------|
| `/not-my-reforge:loop` | sonnet | Iterative execution until completion |
| `/not-my-reforge:spawn` | opus | Decompose task for parallel tmux execution |
| `/not-my-reforge:autopilot` | sonnet | Autonomous multi-task execution |
| `/not-my-reforge:pipeline` | sonnet | Multi-stage quality pipeline |
| `/not-my-reforge:team` | sonnet | Agent Teams with worktree isolation |
| `/not-my-reforge:swarm` | sonnet | Parallel multi-agent dispatch |
| `/not-my-reforge:qa` | sonnet | Auto QA test-fix loop |
| `/not-my-reforge:ralplan` | sonnet | Iterative consensus planning |

### DevOps & Management

| Command | Model | Purpose |
|---------|-------|---------|
| `/not-my-reforge:pr` | sonnet | Generate PR metadata with `gh pr create` |
| `/not-my-reforge:release` | sonnet | Version bumping and changelog generation |
| `/not-my-reforge:status` | haiku | Session metrics dashboard |
| `/not-my-reforge:history` | haiku | Session history |
| `/not-my-reforge:mode` | haiku | Mode status and management |
| `/not-my-reforge:notify` | sonnet | Notification channel configuration |
| `/not-my-reforge:doctor` | haiku | Plugin health diagnostics |

## Keywords

Type these directly in your prompt — no slash needed:

| Keyword | Effect |
|---------|--------|
| `reforge deep <task>` | Opus model + full verification |
| `reforge quick <task>` | Haiku model + minimal verification |
| `reforge review` | Structured code review checklist |
| `reforge analyze <goal>` | Requirements analysis (opus) |
| `reforge critique <target>` | Plan evaluation (opus) |
| `reforge security` | Security audit (opus) |
| `reforge parallel <task>` | Parallel subtask execution |
| `reforge cancel [target]` | Cancel active mode |

## Shortcuts

Type `#keyword` anywhere in your prompt — position doesn't matter:

| Shortcut | Effect |
|----------|--------|
| `#orch [task]` | **Smart orchestration** — auto-selects optimal mode and executes (see below) |
| `#verify` | Run all quality gate checks (build, test, lint, typecheck, TODO scan) |
| `#team` | Team agent setup status and commands |
| `#search <query>` | DeepSearch — 5 parallel search strategies |
| `#review [base]` | Multi-perspective code review (5 parallel agents) |
| `#qa [target]` | Auto QA loop (test→fix→retest, max 3 iterations) |
| `#status` | Session metrics dashboard (modes, agents, locks) |
| `#memo [text]` | View/add notepad notes. Prefix with `!` for critical (survives compaction) |

### `#orch` — Smart Orchestration

`#orch <task>` analyzes your task and automatically selects the optimal orchestration mode:

| Task Pattern | Selected Mode | Execution |
|-------------|---------------|-----------|
| Multiple tasks (comma/and separated) | **team** | tmux + git worktree isolation, parallel workers |
| "fix all" + test-related | **qa** | Auto test→fix→retest cycle (max 3 iterations) |
| "fix all" / `--verify` | **ralph** | Iterative loop with verification (max 10) |
| Analysis / research / audit | **swarm** | 3-5 parallel Task agents, unified report |
| Design / plan / architect | **ralplan** | Propose→critique→revise consensus (max 3 rounds) |
| Quality-critical (payment, auth, security) | **pipeline** | 5-stage gates: plan→implement→verify→fix→review |
| Other single tasks | **pipeline** | Default safe mode |

```bash
# Parallel team with tmux (3 workers + worktree isolation)
#orch implement auth, profiles, and notifications

# Iterative fix with verification
#orch fix all TypeScript errors --verify "npx tsc --noEmit"

# Multi-angle security analysis
#orch analyze security across the codebase

# Consensus-based planning
#orch design the database schema for user management

# Auto QA loop
#orch fix all failing tests

# Show available modes (no task)
#orch
```

Team mode creates isolated git worktrees per worker and launches parallel Claude instances via tmux. After all workers complete, results are merged sequentially.

### Other Examples

```bash
# Run quality checks
#verify

# Search with context
find all auth handlers #search AuthService

# Review against a specific branch
#review develop

# Add a critical note
#memo !Do not modify the payments module until tests are fixed
```

## Automatic Hooks

These run in the background without any action required:

### Safety & Quality

| Hook | Trigger | Effect |
|------|---------|--------|
| **write-guard** | Before `Write` | Blocks overwriting existing files (use `Edit`). Also blocks file ownership conflicts in parallel mode |
| **comment-checker** | After `Write`/`Edit` | Warns about AI slop comments |
| **edit-safety** | After `Edit` | Provides recovery guidance on failure |
| **non-interactive-guard** | Before `Bash` | Blocks interactive commands (vim, less, etc.) |
| **intent-gate** | On prompt | Warns about destructive commands (rm -rf, force push, DROP TABLE, etc.) |
| **mode-guard** | On prompt | Prevents conflicting orchestration modes |

### Verification

| Hook | Trigger | Effect |
|------|---------|--------|
| **verification-gate** | On `Stop` | Checks build/test/lint were run (5-minute freshness) |
| **todo-enforcer** | On `Stop` | Blocks if changed files have unresolved TODOs |
| **deliverable-check** | On `Stop` | Verifies acceptance criteria are met |

### Intelligence

| Hook | Trigger | Effect |
|------|---------|--------|
| **project-memory** | On start + after tools | Auto-detects tech stack, build commands, conventions |
| **learner** | After tools (async) | Learns naming, import, command patterns across sessions |
| **task-sizer** | On prompt | Analyzes complexity, recommends model tier |
| **context-monitor** | After tools | Warns at 60%/80% context usage |
| **failure-tracker** | After `Bash`/`Edit` | Circuit breaker: 3 fails→model up, 5→new approach, 7→user intervention |

### Orchestration

| Hook | Trigger | Effect |
|------|---------|--------|
| **ralph-init/continuation/compact** | Various | Ralph Loop lifecycle management |
| **autopilot-init/gate** | Various | Autopilot task sequencing |
| **pipeline-init/gate** | Various | Pipeline stage management |
| **swarm-init/gate** | Various | Swarm task dispatch |
| **cancel-handler** | On prompt | Unified cancel for all 7 modes |
| **teammate-idle** | TeammateIdle | Check team member changes, assign work |
| **task-completed** | TaskCompleted | Verify team task completion |

### Observability

| Hook | Trigger | Effect |
|------|---------|--------|
| **metrics-collector** | After tools (async) | Track tool failures and timing |
| **subagent-tracker** | After `Task` (async) | Agent spawn analytics (per-type stats, success rates) |
| **hud-update** | After tools (async) | Update tmux HUD statusline |
| **notify-completion** | On `Stop` | Send notifications (Discord/Slack/Telegram/webhook) |
| **session-history-save** | On `Stop` (async) | Record session to history |
| **session-state-save** | On `Stop` (async) | Persist mode state for resume |
| **shutdown-protocol** | On `Stop` (async) | Detect orphan tmux sessions, stale states |
| **code-simplifier** | On `Stop` (async) | Suggest complexity reduction in changed files |

## Skills

| Skill | Invocable | Purpose |
|-------|-----------|---------|
| `project-awareness` | No (auto) | Auto-detect project type, commands, conventions |
| `team-pipeline` | Yes | 5-stage quality pipeline with Agent Teams |
| `deepsearch` | Yes | Multi-strategy parallel codebase search |

## Notifications

Configure notifications for session/task completion:

```bash
/not-my-reforge:notify add discord https://discord.com/api/webhooks/...
/not-my-reforge:notify add slack https://hooks.slack.com/services/...
/not-my-reforge:notify add telegram <bot_token>:<chat_id>
/not-my-reforge:notify status
/not-my-reforge:notify remove discord
```

## Parallel Execution

### tmux Scripts

```bash
# Shared workdir (subtasks modify different files)
bash scripts/tmux-spawn.sh "session-name" "task1" "task2" "task3"

# Git worktree isolation (subtasks might touch same files)
bash scripts/tmux-spawn-worktree.sh "session-name" "task1" "task2" "task3"
```

### Agent Teams

Requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`:

```bash
reforge team 3 implement auth, profiles, notifications
```

Creates 3 workers + 1 reviewer, each in isolated git worktrees. File ownership locks prevent conflicts.

## Project Structure

```
not-my-reforge/
├── .claude-plugin/plugin.json        # Plugin metadata (v2.0.0)
├── package.json                      # Build config (TypeScript)
├── tsconfig.json
├── src/
│   ├── lib/                          # 22 library modules
│   │   ├── io.ts, types.ts, storage.ts, patterns.ts, context.ts
│   │   ├── project-memory/           # Tech stack detection & memory
│   │   ├── notepad/                  # Compaction-resistant notes
│   │   ├── learner/                  # Convention learning & feedback
│   │   ├── verification/             # Evidence-based verification
│   │   ├── circuit-breaker/          # Failure escalation
│   │   ├── intent/                   # Destructive command detection
│   │   ├── deliverable/              # Acceptance criteria checking
│   │   ├── orchestration/            # Smart mode routing (#orch)
│   │   ├── autopilot/                # Autonomous execution state
│   │   ├── pipeline/                 # Quality pipeline state
│   │   ├── ralph/                    # Loop iteration tracking
│   │   ├── swarm/                    # Parallel dispatch state
│   │   ├── team/                     # Team merge coordination
│   │   ├── mode-registry/            # Mode conflict prevention
│   │   ├── model-router/             # Complexity-based model selection
│   │   ├── file-ownership/           # Parallel agent file locking
│   │   ├── session-state/            # Cross-session persistence
│   │   ├── history/                  # Session history
│   │   ├── metrics/                  # Performance tracking & HUD
│   │   ├── notify/                   # Multi-channel notifications
│   │   ├── shutdown/                 # Orphan detection
│   │   └── git-workflow/             # PR & release helpers
│   └── hooks/                        # 39 TypeScript hook implementations
├── dist/                             # Compiled JS (pre-built, git-tracked)
├── agents/                           # 20 core + 5 team agents
│   └── teams/                        # Agent Teams definitions
├── commands/                         # 23 slash commands
├── hooks/
│   ├── hooks.json                    # Hook event configuration
│   └── scripts/                      # Legacy bash hooks (fallback)
├── skills/                           # 3 reusable skills
│   ├── project-awareness/
│   ├── team-pipeline/
│   └── deepsearch/
├── scripts/                          # tmux, HUD, merge utilities
├── .reforge/                         # Runtime data (gitignored)
├── CLAUDE.md
└── README.md
```

## Runtime Data (.reforge/)

Created automatically, gitignored:

| File | Purpose |
|------|---------|
| `project-memory.json` | Detected tech stack, build commands |
| `learned-patterns.json` | Naming, import, command conventions |
| `mode-registry.json` | Active mode, conflict tracking, cancel cooldowns |
| `ralph-state.json` | Ralph Loop iteration state |
| `autopilot-state.json` | Autopilot task queue |
| `pipeline-state.json` | Pipeline stage progress |
| `swarm-state.json` | Swarm task dispatch |
| `team-state.json` | Team worker coordination |
| `circuit-breaker.json` | Failure counts and escalation |
| `file-locks.json` | File ownership locks |
| `agent-metrics.json` | Subagent performance analytics |
| `notepad.md` | Session notes (survives compaction) |
| `session-state.json` | Mode state for resume |
| `notify-config.json` | Notification channel config |

## Requirements

- Claude Code CLI
- Node.js >= 18 (for TypeScript hooks)
- `tmux` (for parallel execution): `brew install tmux`
- `git` (for worktree isolation)

## License

MIT
