// Orchestration router — analyze task → select optimal mode → build execution context

import type { OrchRecommendation, TaskSignals } from "./types.js";

// ---- Signal Analysis ----

function splitTasks(text: string): string[] {
  // Strip --flags before splitting
  const clean = text.replace(/--\w+\s+("[^"]*"|\S+)/g, "").trim();
  const normalized = clean.replace(/\band\b/gi, ",");
  const parts = normalized
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 2);
  return parts.length >= 2 ? parts : [text.trim()];
}

export function analyzeTask(task: string): TaskSignals {
  const lower = task.toLowerCase();
  const tasks = splitTasks(task);

  return {
    tasks,
    taskCount: tasks.length,
    isMultiTask: tasks.length >= 2,
    isIterativeFix:
      /\b(fix\s+(all|every|the|각|모든)|until\b|반복|--verify)/i.test(lower),
    isTestRelated:
      /\b(test|테스트|failing|fail|pass|coverage|jest|pytest|vitest|mocha|cargo\s+test)/i.test(lower),
    isResearch:
      /\b(analy[zs]e|분석|investigate|research|audit|survey|explore|compare)/i.test(lower),
    isPlanning:
      /\b(plan|설계|design|architect|schema|strategy|propose|roadmap|redesign)/i.test(lower),
    isQualityCritical:
      /\b(payment|결제|auth|인증|security|보안|production|운영|migration|마이그레이션|critical|중요|database|데이터베이스)/i.test(lower),
    hasVerifyCmd: /--verify/.test(lower),
    verifyCmd: task.match(/--verify\s+"([^"]+)"/)?.[1] || null,
  };
}

// ---- Mode Selection ----

export function selectMode(signals: TaskSignals): OrchRecommendation {
  // QA Loop: test failures + fix intent
  if (signals.isTestRelated && signals.isIterativeFix) {
    return {
      mode: "qa",
      confidence: 0.9,
      reason: "테스트 관련 반복 수정 → QA Loop",
      tasks: signals.tasks,
    };
  }

  // Ralph Loop: iterative fix with verification
  if (signals.isIterativeFix || signals.hasVerifyCmd) {
    return {
      mode: "ralph",
      confidence: 0.85,
      reason: "반복 실행 + 검증 필요 → Ralph Loop",
      tasks: signals.tasks,
    };
  }

  // Team: multiple independent tasks → parallel with tmux
  if (signals.isMultiTask) {
    const workerCount = Math.min(signals.taskCount, 5);
    return {
      mode: "team",
      confidence: 0.9,
      reason: `${signals.taskCount}개 독립 태스크 → Team (${workerCount} workers, tmux + worktree)`,
      workerCount,
      tasks: signals.tasks,
    };
  }

  // Swarm: research / analysis
  if (signals.isResearch) {
    return {
      mode: "swarm",
      confidence: 0.8,
      reason: "조사/분석 작업 → Swarm (다각도 병렬)",
      tasks: signals.tasks,
    };
  }

  // Ralplan: planning / design
  if (signals.isPlanning) {
    return {
      mode: "ralplan",
      confidence: 0.85,
      reason: "설계/계획 작업 → Ralplan (합의 기반)",
      tasks: signals.tasks,
    };
  }

  // Pipeline: quality-critical single task
  if (signals.isQualityCritical) {
    return {
      mode: "pipeline",
      confidence: 0.85,
      reason: "품질 중요 작업 → Pipeline (5단계 게이트)",
      tasks: signals.tasks,
    };
  }

  // Default: Pipeline (safest for unknown single tasks)
  return {
    mode: "pipeline",
    confidence: 0.6,
    reason: "단일 구현 작업 → Pipeline (plan→implement→verify→fix→review)",
    tasks: signals.tasks,
  };
}

// ---- Execution Context Builders ----

function buildTeamContext(
  task: string,
  rec: OrchRecommendation,
  cwd: string
): string {
  const session = `orch-${Date.now()}`;
  const n = rec.workerCount || rec.tasks.length;
  const wbase = `/tmp/claude-worktrees/${session}`;

  const worktreeLines: string[] = [];
  const tmuxLines: string[] = [];
  const mergeLines: string[] = [];
  const branchCleanup: string[] = [];

  for (let i = 0; i < n; i++) {
    const branch = `orch/${session}/${i + 1}`;
    const taskStr = rec.tasks[i] || `subtask ${i + 1}`;
    const escaped = taskStr.replace(/"/g, '\\"');

    worktreeLines.push(
      `git worktree add -b "${branch}" "${wbase}/agent-${i + 1}" HEAD`
    );

    if (i === 0) {
      tmuxLines.push(
        `tmux new-session -d -s "${session}" -c "${wbase}/agent-1" ` +
          `'claude -p "${escaped}" --output-format json 2>&1 | tee /tmp/claude-spawn-${session}-1.json; echo "Agent 1 complete"; read'`
      );
    } else {
      tmuxLines.push(
        `tmux split-window -t "${session}" -c "${wbase}/agent-${i + 1}" ` +
          `'claude -p "${escaped}" --output-format json 2>&1 | tee /tmp/claude-spawn-${session}-${i + 1}.json; echo "Agent ${i + 1} complete"; read'`
      );
    }

    mergeLines.push(`git merge "${branch}"`);
    branchCleanup.push(`git branch -d "${branch}"`);
  }

  return [
    "=== Auto-Orchestration: Team Mode ===",
    "",
    `Goal: ${task}`,
    `Mode: team (${n} workers + tmux + worktree isolation)`,
    `Confidence: ${Math.round(rec.confidence * 100)}%`,
    `Reason: ${rec.reason}`,
    `Session: ${session}`,
    "",
    "Tasks:",
    ...rec.tasks.map((t, i) => `  ${i + 1}. ${t}`),
    "",
    "EXECUTE NOW:",
    "",
    "Step 1 — Ensure clean state:",
    "If there are uncommitted changes, commit or stash them first.",
    "",
    "Step 2 — Create worktrees:",
    `mkdir -p "${wbase}"`,
    ...worktreeLines,
    "",
    "Step 3 — Launch tmux workers:",
    ...tmuxLines,
    `tmux select-layout -t "${session}" tiled`,
    "",
    "Step 4 — Monitor progress:",
    `tmux list-panes -t "${session}" -F "#{pane_index}: #{pane_current_command}"`,
    "Check outputs:",
    ...Array.from(
      { length: n },
      (_, i) => `  cat /tmp/claude-spawn-${session}-${i + 1}.json`
    ),
    "",
    "Step 5 — After ALL workers complete, merge:",
    `cd "${cwd}"`,
    ...mergeLines,
    "",
    "Step 6 — Cleanup:",
    "git worktree prune",
    ...branchCleanup,
    "",
    "Run the commands above step by step. Start with Step 1.",
  ].join("\n");
}

function buildRalphContext(task: string, rec: OrchRecommendation): string {
  const verifyCmd =
    rec.tasks[0]?.match(/--verify\s+"([^"]+)"/)?.[1] || null;

  return [
    "=== Auto-Orchestration: Ralph Loop ===",
    "",
    `Goal: ${task}`,
    `Mode: ralph (iterative execution + verification)`,
    `Confidence: ${Math.round(rec.confidence * 100)}%`,
    `Reason: ${rec.reason}`,
    "",
    "EXECUTE NOW — Iterative loop (max 10 iterations):",
    "",
    `1. Execute: ${task.replace(/--verify\s+"[^"]+"/g, "").trim()}`,
    verifyCmd
      ? `2. Verify: ${verifyCmd}`
      : "2. Verify: run the project's build/test command",
    "3. Pass → DONE. Signal: [RALPH:DONE]",
    "4. Fail → analyze errors, fix, go to step 1",
    "",
    "Rules:",
    "- Track iteration count",
    "- If stuck 3+ iterations, try a completely different approach",
    "- Never skip verification",
  ].join("\n");
}

function buildAutopilotContext(
  task: string,
  rec: OrchRecommendation
): string {
  return [
    "=== Auto-Orchestration: Autopilot ===",
    "",
    `Goal: ${task}`,
    `Mode: autopilot (sequential multi-task)`,
    `Confidence: ${Math.round(rec.confidence * 100)}%`,
    `Reason: ${rec.reason}`,
    "",
    "EXECUTE NOW:",
    "",
    "Phase 1 — PLAN:",
    "- Decompose the goal into ordered subtasks",
    "- Define acceptance criteria for each",
    "",
    "Phase 2 — EXECUTE (sequential):",
    "- Execute each subtask in dependency order",
    "- Review checkpoint every 3 tasks",
    "- If a task fails 3 times, skip and continue",
    "",
    "Phase 3 — VERIFY:",
    "- Run build + tests + lint",
    "- Report: completed / skipped / failed tasks",
  ].join("\n");
}

function buildPipelineContext(
  task: string,
  rec: OrchRecommendation
): string {
  return [
    "=== Auto-Orchestration: Pipeline ===",
    "",
    `Goal: ${task}`,
    `Mode: pipeline (5-stage quality gates)`,
    `Confidence: ${Math.round(rec.confidence * 100)}%`,
    `Reason: ${rec.reason}`,
    "",
    "EXECUTE NOW — Follow stages in order:",
    "",
    "1. PLAN — Analyze requirements, create plan + acceptance criteria",
    "   Signal: [PLAN COMPLETE]",
    "",
    "2. IMPLEMENT — Execute plan, write code + tests",
    "   Signal: [IMPLEMENT COMPLETE]",
    "",
    "3. VERIFY — Run build, tests, lint, type-check",
    "   Signal: [VERIFY COMPLETE] or [VERIFY FAILED]",
    "",
    "4. FIX — Fix issues from verify (if any), re-verify",
    "   Signal: [FIX COMPLETE]",
    "",
    "5. REVIEW — Review all changes, final quality check",
    "   Signal: [REVIEW COMPLETE]",
    "",
    "Do NOT skip stages. Each must complete before the next.",
  ].join("\n");
}

function buildSwarmContext(task: string, rec: OrchRecommendation): string {
  return [
    "=== Auto-Orchestration: Swarm ===",
    "",
    `Goal: ${task}`,
    `Mode: swarm (parallel multi-agent analysis)`,
    `Confidence: ${Math.round(rec.confidence * 100)}%`,
    `Reason: ${rec.reason}`,
    "",
    "EXECUTE NOW — Launch 3-5 PARALLEL agents using the Task tool:",
    "",
    "1. **Structural** — Architecture, dependencies, coupling",
    "2. **Quality** — Code quality, test coverage, tech debt",
    "3. **Security** — Vulnerabilities, secrets, attack surface",
    "4. **Performance** — Bottlenecks, resource usage, scalability",
    "5. **Impact** — Risk, blast radius, migration path",
    "",
    "Launch ALL in PARALLEL (multiple Task calls in one message).",
    "Synthesize into unified report with recommendations.",
  ].join("\n");
}

function buildQAContext(task: string, rec: OrchRecommendation): string {
  return [
    "=== Auto-Orchestration: QA Loop ===",
    "",
    `Goal: ${task}`,
    `Mode: qa (auto test-fix-retest)`,
    `Confidence: ${Math.round(rec.confidence * 100)}%`,
    `Reason: ${rec.reason}`,
    "",
    "EXECUTE NOW — Loop (max 3 iterations):",
    "",
    "1. Run full test suite → identify failures",
    "2. For each failure: read test + source → root cause",
    "3. Apply minimal fix (NEVER weaken tests)",
    "4. Re-run failing test → verify",
    "5. Run full suite → check regressions",
    "6. New failures → revert, try different approach",
    "",
    "Report: fixed count, remaining failures, files modified.",
  ].join("\n");
}

function buildRalplanContext(
  task: string,
  rec: OrchRecommendation
): string {
  return [
    "=== Auto-Orchestration: Ralplan ===",
    "",
    `Goal: ${task}`,
    `Mode: ralplan (iterative consensus planning)`,
    `Confidence: ${Math.round(rec.confidence * 100)}%`,
    `Reason: ${rec.reason}`,
    "",
    "EXECUTE NOW — Cycle (max 3 rounds):",
    "",
    "Each round:",
    "  1. PROPOSE — Detailed implementation plan",
    "  2. CRITIQUE — Evaluate weaknesses, feasibility",
    "     Rate: GO / GO WITH CHANGES / RECONSIDER",
    "  3. REVISE — Address all concerns",
    "",
    "Continue until GO. Output: approved plan with clear steps.",
  ].join("\n");
}

// ---- Main Export ----

export function buildExecutionContext(
  rec: OrchRecommendation,
  task: string,
  cwd: string
): string {
  switch (rec.mode) {
    case "team":
      return buildTeamContext(task, rec, cwd);
    case "ralph":
      return buildRalphContext(task, rec);
    case "autopilot":
      return buildAutopilotContext(task, rec);
    case "pipeline":
      return buildPipelineContext(task, rec);
    case "swarm":
      return buildSwarmContext(task, rec);
    case "qa":
      return buildQAContext(task, rec);
    case "ralplan":
      return buildRalplanContext(task, rec);
  }
}
