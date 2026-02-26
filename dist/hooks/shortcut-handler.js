// shortcut-handler.ts — # shortcut system for quick access to core features
// Event: UserPromptSubmit
import { readStdin, writeOutput, writeError } from "../lib/io.js";
import { readDataFile, writeDataFile } from "../lib/storage.js";
import { formatModeStatus, activateMode, getActiveMode } from "../lib/mode-registry/registry.js";
import { formatOwnershipStatus } from "../lib/file-ownership/registry.js";
import { loadNotepad, addNote } from "../lib/notepad/storage.js";
import { analyzeTask, selectMode, buildExecutionContext } from "../lib/orchestration/router.js";
import { calculateScore, formatScoreReport } from "../lib/quality/scorer.js";
import { formatTrustStatus } from "../lib/trust/tracker.js";
const SHORTCUT_NAMES = ["orch", "verify", "team", "search", "review", "qa", "status", "memo", "ultrawork", "uw", "deep", "quick", "sec", "analyze", "critique", "help", "score", "trust"];
const SHORTCUT_REGEX = new RegExp(`#(${SHORTCUT_NAMES.join("|")})\\b`, "i");
const SHORTCUTS = [
    // #orch — Smart orchestration: auto-select optimal mode and execute
    {
        name: "orch",
        handler: (cwd, args) => {
            // No args → show menu
            if (!args) {
                const modeStatus = formatModeStatus(cwd);
                return [
                    "=== Orchestration Modes ===",
                    "",
                    modeStatus,
                    "",
                    "Usage: #orch <task description>",
                    "Auto-analyzes your task and selects the optimal mode.",
                    "",
                    "Modes:",
                    "  ralph      — Iterative fix loop (fix all X, --verify)",
                    "  team       — Parallel workers (tmux + worktree isolation)",
                    "  autopilot  — Sequential multi-task",
                    "  pipeline   — 5-stage quality gates",
                    "  swarm      — Multi-angle parallel analysis",
                    "  qa         — Test-fix-retest cycle",
                    "  ralplan    — Consensus planning",
                    "  ultrawork  — ALL agents in parallel (maximum coverage)",
                    "",
                    "Examples:",
                    "  #orch implement auth, profiles, and notifications",
                    "  #orch fix all TypeScript errors --verify \"npx tsc --noEmit\"",
                    "  #orch analyze security across the codebase",
                    "  #orch design the database schema for user management",
                ].join("\n");
            }
            // Check for active mode conflicts
            const active = getActiveMode(cwd);
            const signals = analyzeTask(args);
            const rec = selectMode(signals);
            // Try to activate the selected mode
            const activation = activateMode(cwd, rec.mode, args);
            if (!activation.success) {
                return [
                    "=== Orchestration Blocked ===",
                    "",
                    `Selected mode: ${rec.mode} (${rec.reason})`,
                    `Error: ${activation.error}`,
                    "",
                    active
                        ? `Active mode: ${active.name} — cancel first: reforge cancel ${active.name}`
                        : "Wait for cancel cooldown to expire.",
                ].join("\n");
            }
            // Build and return execution context
            return buildExecutionContext(rec, args, cwd);
        },
    },
    // #verify — Run quality gate checks now
    {
        name: "verify",
        handler: (cwd) => {
            // Check what's been run from circuit-breaker / metrics
            const metrics = readDataFile(cwd, "agent-metrics.json", null);
            const agentCount = metrics?.agents?.length || 0;
            return [
                "=== Quality Verification ===",
                "",
                "Run the following checks NOW:",
                "",
                "1. **Build**: Run the project build command",
                "   → npm run build / cargo build / go build / tsc --noEmit",
                "",
                "2. **Test**: Run the full test suite",
                "   → npm test / cargo test / go test ./... / pytest",
                "",
                "3. **Lint**: Run the linter",
                "   → npm run lint / cargo clippy / golangci-lint run",
                "",
                "4. **Type Check**: Verify type safety",
                "   → npx tsc --noEmit / mypy / pyright",
                "",
                "5. **Unresolved Item Scan**: Check for unresolved action items in changed files",
                "   → git diff --name-only | xargs grep -n 'TO" + "DO\\|FIX" + "ME\\|HACK\\|XXX'",
                "",
                "Run all checks and report results. If any fail, fix them before proceeding.",
                "",
                `Session stats: ${agentCount} agents spawned this session.`,
            ].join("\n");
        },
    },
    // #team — Team agent setup
    {
        name: "team",
        handler: (cwd, args) => {
            const teamState = readDataFile(cwd, "team-state.json", null);
            const lockStatus = formatOwnershipStatus(cwd);
            const lines = [
                "=== Team Agent Setup ===",
                "",
            ];
            if (teamState?.active) {
                lines.push("Team session is ACTIVE.", `Workers: ${teamState.workers?.length || 0}`, lockStatus, "", "Commands:", "  reforge cancel team  — Cancel team session");
            }
            else {
                lines.push("No active team session.", "", "Start a team:", "  reforge team <N> <task>", "", "Examples:", "  reforge team 3 implement auth, profiles, notifications", "  reforge team 2 refactor the API layer and add tests", "", "Team composition: N workers + 1 reviewer", "Each worker gets an isolated git worktree.", "File ownership locks prevent conflicts.", "", "Requires: CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1");
            }
            if (args) {
                lines.push("", `Task: ${args}`, "Set up a team for this task using the format above.");
            }
            return lines.join("\n");
        },
    },
    // #search — DeepSearch
    {
        name: "search",
        handler: (_cwd, args) => {
            if (!args) {
                return [
                    "=== DeepSearch ===",
                    "",
                    "Usage: #search <query>",
                    "",
                    "Executes 5 search strategies in parallel:",
                    "  1. Text search (grep with variations)",
                    "  2. File pattern (glob matching)",
                    "  3. Git history (commits, pickaxe)",
                    "  4. Import tracing (dependency chain)",
                    "  5. Symbol definitions (function/class/type)",
                    "",
                    "Example: #search UserService",
                ].join("\n");
            }
            return [
                "=== DeepSearch ===",
                "",
                `Query: "${args}"`,
                "",
                "Execute these search strategies IN PARALLEL using the Task tool:",
                "",
                "1. **Symbol Search**: Grep for function/class/interface/type/const definitions of \"" + args + "\"",
                "2. **Text Search**: Grep for all occurrences with -C 3 context",
                "3. **File Search**: Glob for **/*" + args + "* (case-insensitive)",
                "4. **Import Trace**: Grep for import/require statements referencing \"" + args + "\"",
                "5. **Git History**: git log -S \"" + args + "\" --oneline (pickaxe search)",
                "",
                "Also try name variations: camelCase, snake_case, PascalCase, kebab-case.",
                "Deduplicate and sort by: definitions > usages > references > history.",
            ].join("\n");
        },
    },
    // #review — Diff review
    {
        name: "review",
        handler: (_cwd, args) => {
            const base = args || "main";
            return [
                "=== Multi-Perspective Code Review ===",
                "",
                `Base branch: ${base}`,
                "",
                "Run git diff and launch 5 PARALLEL review agents:",
                "",
                "1. **Bug Hunter** (haiku) — Logic errors, null issues, race conditions",
                "2. **Security** (sonnet) — XSS, injection, secrets, auth bypasses",
                "3. **Performance** (haiku) — N+1, allocations, bundle size",
                "4. **Style** (haiku) — Naming, conventions, dead code",
                "5. **Architecture** (sonnet) — SOLID, coupling, API design, breaking changes",
                "",
                "Synthesize into unified report with severity levels:",
                "  CRITICAL > HIGH > MEDIUM > LOW",
                "",
                "End with verdict: APPROVE / REQUEST CHANGES / NEEDS DISCUSSION",
            ].join("\n");
        },
    },
    // #qa — QA loop
    {
        name: "qa",
        handler: (_cwd, args) => {
            const target = args || "all tests";
            return [
                "=== Auto QA Loop ===",
                "",
                `Target: ${target}`,
                "",
                "Execute this loop (max 3 iterations):",
                "",
                "1. Run full test suite → identify failures",
                "2. For each failure: read test + code under test → identify root cause",
                "3. Apply minimal fix (never delete or weaken tests)",
                "4. Re-run failing test → verify fix",
                "5. Run full suite → check for regressions",
                "6. If new failures, revert and try different approach",
                "",
                "Report: fixed count, remaining failures, files modified.",
                "If cannot auto-fix after 3 attempts, report root cause to user.",
            ].join("\n");
        },
    },
    // #status — Session metrics
    {
        name: "status",
        handler: (cwd) => {
            const modeStatus = formatModeStatus(cwd);
            const agentMetrics = readDataFile(cwd, "agent-metrics.json", null);
            const lockStatus = formatOwnershipStatus(cwd);
            const lines = ["=== Session Status ===", ""];
            lines.push(modeStatus, "");
            if (agentMetrics?.sessionTotals) {
                const t = agentMetrics.sessionTotals;
                lines.push("Agent Metrics:", `  Total spawned: ${t.totalSpawned}`, `  Success: ${t.successCount}, Failures: ${t.failureCount}`, `  Total agent time: ${Math.round(t.totalDurationMs / 1000)}s`);
                if (agentMetrics.byType) {
                    const top = Object.entries(agentMetrics.byType)
                        .sort(([, a], [, b]) => b.totalCalls - a.totalCalls)
                        .slice(0, 5);
                    if (top.length > 0) {
                        lines.push("  Top agents:");
                        for (const [type, stats] of top) {
                            lines.push(`    ${type}: ${stats.totalCalls} calls, avg ${Math.round(stats.avgDurationMs / 1000)}s, ${stats.successRate}% success`);
                        }
                    }
                }
                lines.push("");
            }
            lines.push(lockStatus);
            return lines.join("\n");
        },
    },
    // #memo — Notepad view/add
    {
        name: "memo",
        handler: (cwd, args) => {
            if (args) {
                // Add a note
                const priority = args.startsWith("!") ? "critical" : "normal";
                const content = priority === "critical" ? args.slice(1).trim() : args;
                const entry = addNote(cwd, content, priority, "other");
                return [
                    "=== Note Added ===",
                    "",
                    `ID: ${entry.id}`,
                    `Priority: ${entry.priority}`,
                    `Content: ${entry.content}`,
                    "",
                    priority === "critical"
                        ? "This note will survive context compaction."
                        : "This note is session-scoped. Prefix with ! for critical (survives compaction).",
                ].join("\n");
            }
            // View notes
            const notepad = loadNotepad(cwd);
            if (notepad.entries.length === 0) {
                return [
                    "=== Notepad ===",
                    "",
                    "No notes yet.",
                    "",
                    "Usage:",
                    "  #memo <text>          — Add normal note",
                    "  #memo !<text>         — Add critical note (survives compaction)",
                ].join("\n");
            }
            const lines = ["=== Notepad ===", ""];
            const critical = notepad.entries.filter((e) => e.priority === "critical");
            const normal = notepad.entries.filter((e) => e.priority === "normal");
            if (critical.length > 0) {
                lines.push("Critical (survives compaction):");
                for (const e of critical) {
                    lines.push(`  [${e.id}] ${e.content}`);
                }
                lines.push("");
            }
            if (normal.length > 0) {
                lines.push("Notes:");
                for (const e of normal.slice(-10)) {
                    lines.push(`  [${e.id}] ${e.content}`);
                }
            }
            return lines.join("\n");
        },
    },
    // #ultrawork / #uw — Maximum parallel agent execution
    {
        name: "ultrawork",
        handler: (_cwd, args) => {
            if (!args) {
                return [
                    "=== Ultrawork Mode ===",
                    "",
                    "Activate ALL available specialized agents in maximum parallel execution.",
                    "",
                    "Usage: #ultrawork <task description>",
                    "Short:  #uw <task description>",
                    "",
                    "Available agents:",
                    "  oracle-deep       — Deep analysis, architecture decisions (opus)",
                    "  analyst           — Requirements decomposition (opus)",
                    "  critic            — Plan evaluation, risk detection (opus)",
                    "  security-reviewer — OWASP, secrets, auth, CVEs (opus)",
                    "  planner           — Implementation roadmap (sonnet)",
                    "  build-fixer       — Compilation/type errors (sonnet)",
                    "  test-engineer     — Test writing, coverage strategy (sonnet)",
                    "  reviewer          — Code quality, conventions (sonnet)",
                    "  qa-engineer       — Test-fix-retest cycles (sonnet)",
                    "  designer          — UI/UX, component structure (sonnet)",
                    "  deepsearch        — Cross-codebase discovery (sonnet)",
                    "  explore           — Context gathering (sonnet)",
                    "",
                    "Example: #uw add user authentication with JWT and refresh tokens",
                ].join("\n");
            }
            return [
                "=== Ultrawork Mode ===",
                "",
                `Task: ${args}`,
                "",
                "EXECUTE NOW — Maximum parallel agent dispatch:",
                "",
                "Phase 1 — Decompose:",
                "Identify which agents are relevant for this task.",
                "",
                "Phase 2 — Launch ALL relevant agents in PARALLEL (one message, run_in_background: true):",
                "",
                `  - oracle-deep:       "Analyze architecture implications of: ${args}"`,
                `  - security-reviewer: "Audit security considerations for: ${args}"`,
                `  - test-engineer:     "Design test strategy for: ${args}"`,
                `  - analyst:           "Decompose requirements for: ${args}"`,
                `  - build-fixer:       "Identify build/compilation risks for: ${args}"`,
                "  - designer:          (add if UI is involved)",
                "",
                "Signal: [UW:DISPATCHED] after launching all agents.",
                "",
                "Phase 3 — Implement the core task while agents run.",
                "",
                "Phase 4 — Aggregate results after all agents complete:",
                "  - Merge findings, resolve conflicts",
                "  - Apply security/quality fixes",
                "Signal: [UW:AGGREGATING]",
                "",
                "Phase 5 — Full verification:",
                "  npm run build --if-present",
                "  npm test --if-present",
                "  npm run lint --if-present",
                "Signal: [UW:VERIFIED] → [UW:DONE]",
            ].join("\n");
        },
    },
    // #uw — Alias for #ultrawork (same handler logic)
    {
        name: "uw",
        handler: (_cwd, args) => {
            if (!args) {
                return [
                    "=== Ultrawork Mode ===",
                    "",
                    "Activate ALL available specialized agents in maximum parallel execution.",
                    "",
                    "Usage: #ultrawork <task description>",
                    "Short:  #uw <task description>",
                    "",
                    "Available agents:",
                    "  oracle-deep       — Deep analysis, architecture decisions (opus)",
                    "  analyst           — Requirements decomposition (opus)",
                    "  critic            — Plan evaluation, risk detection (opus)",
                    "  security-reviewer — OWASP, secrets, auth, CVEs (opus)",
                    "  planner           — Implementation roadmap (sonnet)",
                    "  build-fixer       — Compilation/type errors (sonnet)",
                    "  test-engineer     — Test writing, coverage strategy (sonnet)",
                    "  reviewer          — Code quality, conventions (sonnet)",
                    "  qa-engineer       — Test-fix-retest cycles (sonnet)",
                    "  designer          — UI/UX, component structure (sonnet)",
                    "  deepsearch        — Cross-codebase discovery (sonnet)",
                    "  explore           — Context gathering (sonnet)",
                    "",
                    "Example: #uw add user authentication with JWT and refresh tokens",
                ].join("\n");
            }
            return [
                "=== Ultrawork Mode ===",
                "",
                `Task: ${args}`,
                "",
                "EXECUTE NOW — Maximum parallel agent dispatch:",
                "",
                "Phase 1 — Decompose:",
                "Identify which agents are relevant for this task.",
                "",
                "Phase 2 — Launch ALL relevant agents in PARALLEL (one message, run_in_background: true):",
                "",
                `  - oracle-deep:       "Analyze architecture implications of: ${args}"`,
                `  - security-reviewer: "Audit security considerations for: ${args}"`,
                `  - test-engineer:     "Design test strategy for: ${args}"`,
                `  - analyst:           "Decompose requirements for: ${args}"`,
                `  - build-fixer:       "Identify build/compilation risks for: ${args}"`,
                "  - designer:          (add if UI is involved)",
                "",
                "Signal: [UW:DISPATCHED] after launching all agents.",
                "",
                "Phase 3 — Implement the core task while agents run.",
                "",
                "Phase 4 — Aggregate results after all agents complete:",
                "  - Merge findings, resolve conflicts",
                "  - Apply security/quality fixes",
                "Signal: [UW:AGGREGATING]",
                "",
                "Phase 5 — Full verification:",
                "  npm run build --if-present",
                "  npm test --if-present",
                "  npm run lint --if-present",
                "Signal: [UW:VERIFIED] → [UW:DONE]",
            ].join("\n");
        },
    },
    // #deep — Deep analysis with opus-tier reasoning
    {
        name: "deep",
        handler: (_cwd, args) => {
            if (!args) {
                return [
                    "=== Deep Analysis Mode ===",
                    "",
                    "Usage: #deep <task or question>",
                    "",
                    "Uses opus-tier agents for thorough, deep analysis.",
                    "Considers edge cases, architectural implications, long-term maintainability.",
                    "",
                    "Agents used: oracle-deep, analyst, critic",
                    "",
                    "Example: #deep analyze the auth flow for security vulnerabilities",
                ].join("\n");
            }
            return [
                "=== Deep Analysis Mode ===",
                "",
                `Task: ${args}`,
                "",
                "Use thorough, deep analysis for this task:",
                "  - Consider edge cases and architectural implications",
                "  - Evaluate long-term maintainability",
                "  - Check for security, performance, and correctness concerns",
                "",
                "Preferred agents (launch via Task tool):",
                "  oracle-deep  — Architecture analysis (opus)",
                "  analyst       — Requirements decomposition (opus)",
                "  critic        — Plan evaluation (opus)",
                "",
                "Run full verification (build, test, lint) before concluding.",
            ].join("\n");
        },
    },
    // #quick — Fast execution with haiku-tier speed
    {
        name: "quick",
        handler: (_cwd, args) => {
            if (!args) {
                return [
                    "=== Quick Mode ===",
                    "",
                    "Usage: #quick <task or question>",
                    "",
                    "Prioritizes speed over depth. Concise, direct answers.",
                    "Uses haiku-tier agents for fast turnaround.",
                    "",
                    "Agents: oracle-quick, reviewer-quick, explore",
                    "",
                    "Example: #quick what does this function do?",
                ].join("\n");
            }
            return [
                "=== Quick Mode ===",
                "",
                `Task: ${args}`,
                "",
                "Prioritize SPEED over depth:",
                "  - Give concise, direct answers",
                "  - Skip full verification — focus on the specific ask",
                "  - Use haiku model for analysis tasks",
                "",
                "Preferred agents (launch via Task tool):",
                "  oracle-quick   — Fast architecture scan (haiku)",
                "  reviewer-quick  — Fast code review (haiku)",
                "  explore         — Quick codebase search (haiku)",
            ].join("\n");
        },
    },
    // #sec — Security audit
    {
        name: "sec",
        handler: (_cwd, args) => {
            if (!args) {
                return [
                    "=== Security Audit ===",
                    "",
                    "Usage: #sec [target or scope]",
                    "",
                    "Thorough security audit using opus-tier analysis.",
                    "Checks: OWASP Top 10, secrets, CVEs, auth, input validation.",
                    "",
                    "Example: #sec audit the API authentication layer",
                ].join("\n");
            }
            return [
                "=== Security Audit ===",
                "",
                `Scope: ${args}`,
                "",
                "Launch the security-reviewer agent (opus) to check:",
                "  1. OWASP Top 10 vulnerabilities",
                "  2. Secrets detection (API keys, tokens, passwords in code)",
                "  3. Dependency CVEs (npm audit / cargo audit)",
                "  4. Input validation and sanitization",
                "  5. Authentication and authorization bypasses",
                "  6. Injection vectors (SQL, XSS, command injection)",
                "",
                "Rate findings: CRITICAL > HIGH > MEDIUM > LOW",
                "Provide file:line references for every finding.",
            ].join("\n");
        },
    },
    // #analyze — Requirements analysis
    {
        name: "analyze",
        handler: (_cwd, args) => {
            if (!args) {
                return [
                    "=== Requirements Analysis ===",
                    "",
                    "Usage: #analyze <goal or feature>",
                    "",
                    "Decomposes goals into structured requirements.",
                    "Uses the analyst agent (opus) for thorough decomposition.",
                    "",
                    "Example: #analyze add multi-tenant support to the API",
                ].join("\n");
            }
            return [
                "=== Requirements Analysis ===",
                "",
                `Goal: ${args}`,
                "",
                "Launch the analyst agent (opus) to decompose this into:",
                "  1. Functional requirements (what must it do?)",
                "  2. Non-functional requirements (performance, security, scalability)",
                "  3. Constraints (technical, business, timeline)",
                "  4. Dependencies (existing code, external services, data)",
                "  5. Acceptance criteria for each requirement",
                "",
                "Output: structured spec with priority levels (must/should/nice-to-have).",
            ].join("\n");
        },
    },
    // #critique — Plan evaluation
    {
        name: "critique",
        handler: (_cwd, args) => {
            if (!args) {
                return [
                    "=== Plan Critique ===",
                    "",
                    "Usage: #critique <plan or approach to evaluate>",
                    "",
                    "Evaluates plans for gaps, risks, and overlooked alternatives.",
                    "Uses the critic agent (opus) for structured evaluation.",
                    "",
                    "Example: #critique the migration plan from REST to GraphQL",
                ].join("\n");
            }
            return [
                "=== Plan Critique ===",
                "",
                `Target: ${args}`,
                "",
                "Launch the critic agent (opus) to evaluate:",
                "  1. Gaps — missing steps, unhandled scenarios",
                "  2. Risks — what could go wrong, blast radius",
                "  3. Over-engineering — unnecessary complexity",
                "  4. Alternatives — overlooked simpler approaches",
                "  5. Dependencies — implicit assumptions, coupling",
                "",
                "Provide constructive criticism with actionable suggestions.",
                "End with: APPROVE / REVISE / RETHINK verdict.",
            ].join("\n");
        },
    },
    // #help — Show all available commands and current state
    {
        name: "help",
        handler: (cwd) => {
            const active = getActiveMode(cwd);
            return [
                "=== not-my-reforge Commands ===",
                "",
                "# Shortcuts (type anywhere in prompt):",
                "  #orch <task>      — Auto-select mode and execute",
                "  #ultrawork <task> — ALL agents in parallel (alias: #uw)",
                "  #deep <task>      — Deep opus-tier analysis",
                "  #quick <task>     — Fast haiku-tier execution",
                "  #search <query>   — 5-strategy parallel search",
                "  #review [base]    — Multi-perspective code review",
                "  #sec [scope]      — Security audit (OWASP, CVEs)",
                "  #analyze <goal>   — Requirements decomposition",
                "  #critique <plan>  — Plan evaluation and critique",
                "  #qa [target]      — Auto test-fix-retest loop",
                "  #team             — Team agent setup",
                "  #status           — Session metrics and state",
                "  #score            — Quality score report",
                "  #trust            — Trust level and progression",
                "  #memo [text]      — Notepad (! prefix = critical)",
                "  #verify           — Run all quality checks",
                "  #help             — This help message",
                "",
                "reforge Keywords (start of prompt):",
                "  reforge deep <task>       — Deep analysis context",
                "  reforge quick <task>      — Fast execution context",
                "  reforge team N <task>     — Team of N workers",
                "  reforge qa <target>       — QA loop",
                "  reforge review            — Code review",
                "  reforge security          — Security scan",
                "  reforge analyze <goal>    — Requirements analysis",
                "  reforge critique <plan>   — Plan critique",
                "  reforge parallel <task>   — Parallel execution",
                "  reforge ralplan <goal>    — Consensus planning",
                "  reforge ultrawork <task>  — Maximum agents",
                "",
                "Orchestration Modes:",
                "  reforge autopilot <task>  — Sequential multi-task",
                "  reforge pipeline <task>   — 5-stage quality gates",
                "  reforge loop <task>       — Iterative fix loop",
                "  reforge swarm <task>      — Multi-angle analysis",
                "  reforge cancel <mode>     — Cancel active mode",
                "",
                active ? `Active mode: ${active.name}` : "No active mode.",
            ].join("\n");
        },
    },
    // #score — Quality score report for current session
    {
        name: "score",
        handler: (cwd) => {
            // calculateScore is called internally by formatScoreReport; suppress unused-var warning
            void calculateScore(cwd);
            return formatScoreReport(cwd);
        },
    },
    // #trust — Show progressive trust level and progression criteria
    {
        name: "trust",
        handler: (cwd) => {
            return formatTrustStatus(cwd);
        },
    },
];
async function main() {
    const input = await readStdin();
    const cwd = input.cwd;
    const prompt = input.prompt?.trim() || "";
    if (!cwd || !prompt)
        process.exit(0);
    // Check if any @shortcut exists anywhere in the prompt
    const shortcutMatch = prompt.match(SHORTCUT_REGEX);
    if (!shortcutMatch)
        process.exit(0);
    const shortcutName = shortcutMatch[1].toLowerCase();
    const shortcut = SHORTCUTS.find((s) => s.name === shortcutName);
    if (!shortcut)
        process.exit(0);
    // Extract context: everything in the prompt except the #keyword itself
    const context = prompt
        .replace(new RegExp(`#${shortcutName}\\b`, "i"), "")
        .trim();
    const output = shortcut.handler(cwd, context);
    // Track last used shortcut for sidebar display
    writeDataFile(cwd, "shortcut-state.json", {
        lastShortcut: {
            name: shortcutName,
            usedAt: Date.now(),
            context: context || null,
        },
    });
    // Notify user that the shortcut was caught
    const label = context
        ? `[#${shortcutName}] ${context.slice(0, 60)}${context.length > 60 ? "..." : ""}`
        : `[#${shortcutName}]`;
    writeError(label);
    writeOutput({
        hookSpecificOutput: {
            hookEventName: "UserPromptSubmit",
            additionalContext: output,
        },
    });
}
main();
