// keyword-detector.ts — Detect reforge keywords and inject appropriate context
// Event: UserPromptSubmit

import { readStdin, writeOutput } from "../lib/io.js";
import type { UserPromptSubmitInput } from "../lib/types.js";

interface KeywordMatch {
  keyword: string;
  context: string;
}

const KEYWORD_HANDLERS: ((prompt: string) => KeywordMatch | null)[] = [
  // reforge deep — deep analysis with opus-tier context
  (prompt) => {
    const match = prompt.match(/^reforge\s+deep\s+(.+)/i);
    if (!match) return null;
    return {
      keyword: "deep",
      context: [
        "[Reforge Deep Mode]",
        "Use thorough, deep analysis. Consider edge cases, architectural implications, and long-term maintainability.",
        "Prefer the oracle-deep agent (opus model) for analysis tasks.",
        "Run full verification (build, test, lint) before concluding.",
        `Task: ${match[1]}`,
      ].join("\n"),
    };
  },

  // reforge quick — fast execution with haiku-tier context
  (prompt) => {
    const match = prompt.match(/^reforge\s+quick\s+(.+)/i);
    if (!match) return null;
    return {
      keyword: "quick",
      context: [
        "[Reforge Quick Mode]",
        "Prioritize speed over depth. Give concise, direct answers.",
        "Use oracle-quick (haiku) or reviewer-quick (haiku) for analysis.",
        "Skip full verification — focus on the specific ask.",
        `Task: ${match[1]}`,
      ].join("\n"),
    };
  },

  // reforge review — code review checklist injection
  (prompt) => {
    if (!/^reforge\s+review\b/i.test(prompt)) return null;
    return {
      keyword: "review",
      context: [
        "[Reforge Review Mode]",
        "Perform a structured code review using the reviewer agent.",
        "Checklist: Correctness, Edge Cases, Error Handling, Security, Performance, Naming, Tests, Types, Conventions.",
        "Use severity levels: CRITICAL > HIGH > MEDIUM > LOW.",
        "Provide file:line references for every finding.",
      ].join("\n"),
    };
  },

  // reforge team N — team creation directive
  (prompt) => {
    const match = prompt.match(/^reforge\s+team\s+(\d+)\s+(.+)/i);
    if (!match) return null;
    const count = parseInt(match[1], 10);
    return {
      keyword: "team",
      context: [
        "[Reforge Team Mode]",
        `Create a team of ${count} workers + 1 reviewer to handle this task.`,
        "Use Agent Teams with worktree isolation for each worker.",
        "The lead agent should decompose the task, assign subtasks, and coordinate.",
        "Each worker operates in an isolated git worktree.",
        "The reviewer validates all changes before merge.",
        `Task: ${match[2]}`,
      ].join("\n"),
    };
  },

  // reforge autopilot — handled by autopilot-init.ts hook
  // reforge pipeline — handled by pipeline-init.ts hook
  // reforge swarm — handled by swarm-init.ts hook
  // reforge loop — handled by ralph-init.ts hook
  // reforge cancel — handled by cancel-handler.ts hook
  // reforge qa — handled by qa-init (keyword below injects context)
  // reforge ralplan — handled by ralplan-init (keyword below injects context)

  // reforge qa — auto QA loop
  (prompt) => {
    const match = prompt.match(/^reforge\s+qa\s+(.+)/i);
    if (!match) return null;
    return {
      keyword: "qa",
      context: [
        "[Reforge QA Mode]",
        "Activate automatic QA loop: run tests → analyze failures → fix → retest.",
        "Use the qa-engineer agent (sonnet) for test analysis and fixes.",
        "Maximum 3 fix iterations before escalating to user.",
        "Run full test suite first, then focus on failing tests.",
        `Target: ${match[1]}`,
      ].join("\n"),
    };
  },

  // reforge ralplan — iterative consensus planning
  (prompt) => {
    const match = prompt.match(/^reforge\s+ralplan\s+(.+)/i);
    if (!match) return null;
    return {
      keyword: "ralplan",
      context: [
        "[Reforge Ralplan Mode]",
        "Activate iterative consensus planning: planner proposes → critic evaluates → iterate.",
        "Use the consensus-planner agent (sonnet) for structured debate.",
        "Maximum 3 rounds of iteration before finalizing.",
        "Each round: Plan → Critique → Revise → Re-evaluate.",
        "Final output: consensus plan with risk assessment.",
        `Goal: ${match[1]}`,
      ].join("\n"),
    };
  },

  // reforge parallel — parallel execution hint
  (prompt) => {
    const match = prompt.match(/^reforge\s+parallel\s+(.+)/i);
    if (!match) return null;
    return {
      keyword: "parallel",
      context: [
        "[Reforge Parallel Mode]",
        "Execute subtasks in parallel using the Task tool with multiple concurrent agents.",
        "Decompose the goal into independent subtasks that can run simultaneously.",
        "Use background agents (run_in_background: true) for long-running tasks.",
        "Aggregate results after all agents complete.",
        `Goal: ${match[1]}`,
      ].join("\n"),
    };
  },

  // reforge analyze — requirements analysis
  (prompt) => {
    const match = prompt.match(/^reforge\s+analyze\s+(.+)/i);
    if (!match) return null;
    return {
      keyword: "analyze",
      context: [
        "[Reforge Analyze Mode]",
        "Use the analyst agent (opus) to decompose this into requirements.",
        "Identify functional/non-functional requirements, constraints, dependencies.",
        "Define acceptance criteria for each requirement.",
        `Goal: ${match[1]}`,
      ].join("\n"),
    };
  },

  // reforge critique — plan evaluation
  (prompt) => {
    const match = prompt.match(/^reforge\s+critiqu?e\s+(.+)/i);
    if (!match) return null;
    return {
      keyword: "critique",
      context: [
        "[Reforge Critique Mode]",
        "Use the critic agent (opus) to evaluate this plan or approach.",
        "Check for gaps, risks, over-engineering, and overlooked alternatives.",
        "Provide constructive criticism with actionable suggestions.",
        `Target: ${match[1]}`,
      ].join("\n"),
    };
  },

  // reforge security — security scan
  (prompt) => {
    if (!/^reforge\s+security\b/i.test(prompt)) return null;
    return {
      keyword: "security",
      context: [
        "[Reforge Security Mode]",
        "Use the security-reviewer agent (opus) for a thorough security audit.",
        "Check OWASP Top 10, secrets detection, dependency CVEs, input validation.",
        "Rate each finding by severity: CRITICAL > HIGH > MEDIUM > LOW.",
      ].join("\n"),
    };
  },
];

async function main() {
  const input = await readStdin<UserPromptSubmitInput>();
  const prompt = input.user_prompt;

  if (!prompt) process.exit(0);

  for (const handler of KEYWORD_HANDLERS) {
    const result = handler(prompt);
    if (result) {
      writeOutput({
        hookSpecificOutput: {
          hookEventName: "PostToolUse" as const,
          additionalContext: result.context,
        },
      });
      break;
    }
  }
}

main();
