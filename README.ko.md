# not-my-reforge

![not-my-reforge](assets/banner.png)

*not oh-my. reforged.*

한국어 | **[English](README.md)**

당신의 Claude Code, 일일이 지시하지 않아도 됩니다.

**not-my-reforge**는 AI 에이전트가 스스로 신뢰를 쌓고, 실수를 고치고, 자기 자신을 오케스트레이션하도록 가르칩니다 — 프롬프트 잔소리를 그만두고 결과물에 집중하세요.

> oh-my-\*는 에이전트에게 명령을 줬습니다. 우리는 자율성을 줬습니다.

### 왜 만들었나

대부분의 Claude Code 플러그인은 누를 버튼을 더 만들어줍니다. 우리는 정반대로 갔습니다: **당신의 결정은 줄이고, 에이전트의 판단은 높이고.**

- **Progressive Trust** — 에이전트는 조심스럽게 시작해서 성공적인 작업으로 권한을 획득합니다. 토글이 아닙니다. 신뢰 시스템입니다.
- **자가 치유 루프** — 빌드 실패? 에이전트가 보고만 하지 않습니다. 에러를 읽고, Failure Playbook을 참고하고, 고친 다음, 빌드를 다시 돌립니다.
- **선택이 아닌 품질** — 모든 편집, 모든 빌드, 모든 테스트가 세션 Quality Score에 반영됩니다. "내 컴퓨터에서는 되는데"는 이제 그만.
- **팀 스케일 오케스트레이션** — 하나의 작업, 여러 에이전트, 격리된 worktree, 자동 병합. 목표만 말하세요. 나머지는 swarm이 알아서 합니다.

런타임 의존성 제로. 순수 훅 아키텍처. 설치 마법사 없음. 설정 의식 없음.

설치하고 맡기세요.

## 설치

```
/plugin marketplace https://github.com/speson/not-my-reforge
/plugin install not-my-reforge
```

최상의 경험(사이드바 대시보드, 병렬 실행)을 위해 tmux 안에서 실행하세요:

```bash
tmux new-session "claude --dangerously-skip-permissions"
```

<details>
<summary>로컬 개발</summary>

```bash
git clone https://github.com/speson/not-my-reforge
cd not-my-reforge && npm install && npm run build

# 전체 기능 사용을 위해 tmux 안에서 실행
tmux new-session "claude --plugin-dir ."
```

> **참고:** 이 플러그인 자체를 개발할 때는 반드시 `--plugin-dir`로 로컬 소스를 지정하세요.
> 설치된 버전(`~/.claude/plugins/cache/...`)은 별도 복사본이므로, repo 수정사항은
> 재설치하거나 이 플래그를 사용해야 반영됩니다.
</details>

## 빠른 시작

```bash
#orch implement auth, profiles, and notifications   # 스마트 오케스트레이션
#deep refactor the authentication module             # 심층 분석 (opus)
#quick what does this function do?                   # 빠른 답변 (haiku)
#sec audit the API authentication layer              # 보안 스캔
#score                                               # 품질 점수 리포트
#trust                                               # 신뢰 레벨 상태
/not-my-reforge:diff-review                          # 5가지 관점 리뷰
#search UserService                                  # DeepSearch
```

## 오케스트레이션 모드

8가지 모드 — 또는 `#orch`가 자동 선택:

| 모드 | 명령어 | 용도 |
|------|--------|------|
| **Ralph Loop** | `reforge loop <task>` | 성공할 때까지 반복 개선 |
| **Autopilot** | `reforge autopilot <goal>` | 순차적 멀티태스크 자동화 |
| **Pipeline** | `reforge pipeline <goal>` | 품질 게이트: 계획 → 구현 → 검증 → 수정 → 리뷰 |
| **Team** | `reforge team N <task>` | 병렬 워커 + worktree 격리 |
| **Swarm** | `reforge swarm <goal>` | 병렬 리서치 및 분석 |
| **QA Loop** | `reforge qa <target>` | 자동 테스트 → 수정 → 재테스트 |
| **Ralplan** | `reforge ralplan <goal>` | 반복적 합의 기반 계획 수립 |
| **Ultrawork** | `#ultrawork <task>` / `#uw <task>` | 모든 에이전트 최대 병렬 실행 |

`#orch` 라우팅:

| 패턴 | 모드 |
|------|------|
| 여러 작업 (쉼표/and) | team |
| 다중 작업 + 복잡한 범위 | ultrawork |
| "fix all" + 테스트 관련 | qa |
| "fix all" / `--verify` | ralph |
| 분석 / 리서치 / 감사 | swarm |
| 설계 / 계획 / 아키텍처 | ralplan |
| 품질 중요 (결제, 인증) | pipeline |

```bash
reforge cancel              # 모든 모드 취소
/not-my-reforge:mode        # 활성 모드 확인
```

## 에이전트

**코어 20** + **팀 5** 에이전트:

| 에이전트 | 모델 | 역할 |
|----------|------|------|
| `oracle` / `oracle-deep` / `oracle-quick` | sonnet/opus/haiku | 아키텍처 분석 |
| `planner` / `planner-quick` | opus/sonnet | 구현 계획 |
| `reviewer` / `reviewer-quick` | sonnet/haiku | 코드 리뷰 |
| `security-reviewer` | opus | 보안 감사 (OWASP Top 10) |
| `build-fixer` | sonnet | 빌드 에러 전문가 |
| `designer` | sonnet | UI/UX 디자인 |
| `test-engineer` | sonnet | 테스트 설계, TDD |
| `analyst` | opus | 요구사항 분해 |
| `critic` | opus | 계획 평가 |
| `explore` | haiku | 빠른 코드베이스 탐색 |
| `librarian` | sonnet | 문서 리서치 |
| `vision` | sonnet | 스크린샷/목업 분석 |
| `git-master` | sonnet | Git 워크플로, 충돌 해결 |
| `qa-engineer` | sonnet | 자동 QA 루프 |
| `consensus-planner` | sonnet | 계획-비평-수정 사이클 |
| `deepsearch` | sonnet | 다중 전략 검색 |

팀 에이전트: `lead`, `worker`, `researcher`, `tester`, `reviewer-teammate`

## 커맨드

| | 커맨드 | 역할 |
|---|--------|------|
| **워크플로** | `quick` `deep` `visual` `review` `diff-review` `init` `deepinit` `handoff` | 작업 실행 및 프로젝트 설정 |
| **오케스트레이션** | `loop` `spawn` `autopilot` `pipeline` `team` `swarm` `qa` `ralplan` `ultrawork` | 다단계 자동화 |
| **DevOps** | `pr` `release` `status` `history` `mode` `notify` `doctor` | Git, 메트릭, 진단 |

모든 커맨드는 `/not-my-reforge:` 접두사 사용 (예: `/not-my-reforge:quick`)

## 키워드 & 단축키

**키워드** (직접 입력):

| 키워드 | 효과 |
|--------|------|
| `reforge deep/quick <task>` | 모델 라우팅 (opus/haiku) |
| `reforge review/analyze/critique/security` | 전문 분석 |
| `reforge parallel <task>` | 병렬 서브태스크 실행 |
| `reforge ultrawork <task>` | 최대 병렬 에이전트 |
| `reforge cancel [target]` | 활성 모드 취소 |

**단축키** (`#` 접두사, 프롬프트 어디서나):

| 단축키 | 효과 |
|--------|------|
| `#orch [task]` | 스마트 오케스트레이션 — 자동 모드 선택 |
| `#ultrawork <task>` / `#uw` | 모든 에이전트 병렬 실행 |
| `#deep <task>` | 심층 opus급 분석 |
| `#quick <task>` | 빠른 haiku급 실행 |
| `#search <query>` | DeepSearch (5가지 전략) |
| `#review [base]` | 다관점 코드 리뷰 |
| `#sec [scope]` | 보안 감사 (OWASP, CVE) |
| `#analyze <goal>` | 요구사항 분해 |
| `#critique <plan>` | 계획 평가 및 비평 |
| `#qa [target]` | 자동 테스트-수정-재테스트 루프 |
| `#team` | 팀 에이전트 상태 |
| `#score` | 품질 점수 리포트 |
| `#trust` | Progressive Trust 레벨 |
| `#status` | 세션 메트릭 |
| `#memo [text]` | 세션 메모 (`!` = 중요) |
| `#verify` | 전체 품질 검사 실행 |
| `#help` | 전체 커맨드 레퍼런스 |

활성 단축키는 tmux 사이드바 대시보드에 표시됩니다.

## 훅

6개 카테고리, 45개 이상의 자동 훅:

| 카테고리 | 훅 | 주요 기능 |
|----------|-----|----------|
| **안전** | write-guard, comment-checker, edit-safety, non-interactive-guard, intent-gate, mode-guard | 덮어쓰기 차단, AI 슬롭 차단, 위험 명령 차단 |
| **검증** | verification-gate, todo-enforcer, deliverable-check | Stop 시점 품질 검사 |
| **지능** | project-memory, learner, task-sizer, context-monitor, failure-tracker, directory-agent-injector, session-recovery | 스택 자동감지, 패턴 학습, 서킷 브레이커, 복구 |
| **신뢰 & 품질** | permission-bypass, trust-tracker | Progressive Trust (L0→L3), 스마트 자동승인, 품질 점수 추적 |
| **오케스트레이션** | ralph-\*, autopilot-\*, pipeline-\*, swarm-\*, cancel-handler, teammate-idle, task-completed | 모드 라이프사이클 관리 |
| **관측성** | metrics-collector, subagent-tracker, hud-update, todo-tracker, notify-completion, session-\*, shutdown-protocol, code-simplifier | 추적, 알림, 정리 |

## Progressive Trust

세션 범위 권한 에스컬레이션 — 성공적인 작업으로 신뢰를 획득:

| 레벨 | 이름 | 자동 승인 | 도달 조건 |
|------|------|----------|----------|
| 0 | Strict | 안전한 Bash, Read, .reforge/ 쓰기 | 기본값 |
| 1 | Familiar | + Edit | 연속 5회 Edit/Write 성공 |
| 2 | Trusted | + Write, 빌드/테스트 명령 | 빌드 통과 |
| 3 | Autonomous | + 비파괴적 Bash 전체 | 테스트 통과 |

파괴적 명령(`rm -rf`, `git push --force`, `DROP TABLE`)은 절대 자동 승인되지 않습니다.
상태 확인: `#trust`

## Quality Score

가중 세션 건강 메트릭 — `#score`로 확인:

| 구성요소 | 가중치 | 출처 |
|----------|--------|------|
| 편집 성공률 | 30% | 성공 편집 / 전체 편집 |
| 빌드 건강도 | 25% | 마지막 빌드 성공/실패 |
| 테스트 건강도 | 25% | 마지막 테스트 성공/실패 |
| 코드 청결도 | 20% | 슬롭 코멘트 수 |

## 스킬

| 스킬 | 역할 |
|------|------|
| `project-awareness` (자동) | 기술 스택 감지 및 메모리 |
| `team-pipeline` | Agent Teams 5단계 품질 파이프라인 |
| `deepsearch` | 다중 전략 병렬 코드베이스 검색 |
| `code-audit` | 5개 에이전트 병렬 보안/품질/성능 감사 |
| `safe-experiment` | Worktree 격리 코드 실험 |

## MCP 서버

제로 설정 — `.mcp.json`에 번들, 자동으로 사용 가능:

| 서버 | 역할 |
|------|------|
| [Context7](https://context7.com) | 라이브러리 문서 조회 |
| [grep.app](https://grep.app) | 크로스 레포지토리 코드 검색 |

## 알림

```bash
/not-my-reforge:notify add discord <webhook_url>
/not-my-reforge:notify add slack <webhook_url>
/not-my-reforge:notify add telegram <bot_token>:<chat_id>
```

## 사이드바 대시보드

세션 시작 시 tmux 사이드바(40칸)가 자동으로 열리며 3개 섹션을 표시합니다:

```
  not-my-reforge v2.4.0

  SHORTCUT
  ◆ ralph — Implement auth
  ⏱ 3m 22s

─────────────────────────────────────

  TASKS
  ✓ 1. Setup auth module
  ◆ 2. Implement login flow
  ○ 3. Add tests
  ━━━━━━━━━━━━━━░░░░░░░░░░░░░░░░  1/3

─────────────────────────────────────

  GIT DIFF
  3 files changed

  src/auth.ts                    +42
  src/hooks/login.ts          +8 -3
  tests/auth.test.ts            +15
```

- **Shortcut**: 활성 모드 이름, 목표, 경과 시간
- **Todo**: 실시간 작업 진행 (TaskCreate/TaskUpdate)
- **Git Diff**: 파일별 추가/삭제 라인

2초마다 폴링. tmux 필요 — tmux 밖에서는 자동으로 건너뜁니다.

## 병렬 실행

```bash
# tmux — 공유 작업 디렉토리
bash scripts/tmux-spawn.sh "session" "task1" "task2" "task3"

# tmux — git worktree 격리
bash scripts/tmux-spawn-worktree.sh "session" "task1" "task2" "task3"

# Agent Teams (CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 필요)
reforge team 3 implement auth, profiles, notifications
```

## Failure Playbook

도구 실패 시 에러 유형별 자동 복구 제안 주입:

| 에러 유형 | 패턴 예시 | 복구 전략 |
|----------|----------|----------|
| TypeScript | `error TS2345` | 타입 정의 읽기, 제약조건 확인 |
| 테스트 | `FAIL`, `Expected X Received Y` | 실패 테스트 단독 실행 |
| 빌드 | `Module not found` | import 확인, `npm ls` 체크 |
| 권한 | `EACCES` | 파일 권한 확인 |
| 구문 | `Unexpected token` | 에러 라인 근처 괄호/쉼표 확인 |

## 프로젝트 구조

```
not-my-reforge/
├── .claude-plugin/plugin.json   # 플러그인 매니페스트
├── .mcp.json                    # MCP 서버 설정 (Context7, grep.app)
├── agents/                      # 25 에이전트 (코어 20 + 팀 5)
├── commands/                    # 24 슬래시 커맨드
├── hooks/hooks.json             # 45+ 훅 정의
├── skills/                      # 5 스킬
├── scripts/                     # tmux, HUD, merge, find-node
├── src/hooks/                   # 훅 구현체 (TypeScript)
├── src/lib/                     # 공유 라이브러리 (trust, quality, playbook, ...)
├── dist/                        # 컴파일된 JS (프리빌트)
├── package.json
├── CLAUDE.md
├── .gitignore
└── README.md
```

## 앞으로의 방향

더 큰 플러그인을 만드는 게 아닙니다. *의도*와 *완료* 사이의 간극을 좁히고 있습니다.

- **축적되는 에이전트 메모리** — 세션이 매번 0에서 시작하면 안 됩니다. 오늘 학습한 패턴이 내일을 가속해야 합니다.
- **전이되는 신뢰** — 한 프로젝트에서 증명한 역량을 다음 프로젝트로 가져갑니다.
- **사라지는 오케스트레이션** — 최고의 워크플로는 생각할 필요가 없는 워크플로. `#orch`는 첫 걸음이고, 보이지 않는 라우팅이 목적지입니다.
- **의식이 아닌 문화로서의 품질** — 막는 게이트가 아니라 가르치는 게이트. 모든 실패는 플레이북 항목이 되기를 기다리고 있습니다.

최종 상태? 원하는 것을 말합니다. 에이전트가 방법을 찾고, 작동을 증명하고, 진짜 모를 때만 물어봅니다.

아직 거기까지는 아닙니다. 하지만 매 릴리스마다 가까워지고 있습니다.

## 요구사항

- Claude Code CLI
- Node.js >= 18
- `tmux` (선택, 병렬 실행용)
- `git` (worktree 격리용)

## 라이선스

MIT
