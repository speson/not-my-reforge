// shortcut-handler.ts — # shortcut system for quick access to core features
// Event: UserPromptSubmit
import { readStdin, writeOutput, writeError } from "../lib/io.js";
import { readDataFile } from "../lib/storage.js";
import { formatModeStatus, activateMode, getActiveMode } from "../lib/mode-registry/registry.js";
import { formatOwnershipStatus } from "../lib/file-ownership/registry.js";
import { loadNotepad, addNote } from "../lib/notepad/storage.js";
import { analyzeTask, selectMode, buildExecutionContext } from "../lib/orchestration/router.js";
const SHORTCUT_NAMES = ["orch", "verify", "team", "search", "review", "qa", "status", "memo"];
const SHORTCUT_REGEX = new RegExp(`#(${SHORTCUT_NAMES.join("|")})\\b`, "i");
// Popup color themes per shortcut: [bg 256-color, fg 256-color, icon]
const SHORTCUT_THEMES = {
    orch: [55, 230, "🎯"], // purple
    verify: [22, 230, "✅"], // green
    team: [24, 230, "👥"], // blue
    search: [130, 230, "🔍"], // orange
    review: [124, 230, "📝"], // red
    qa: [30, 230, "🧪"], // teal
    status: [240, 230, "📊"], // grey
    memo: [94, 230, "📌"], // amber
};
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
                    "  ralph    — Iterative fix loop (fix all X, --verify)",
                    "  team     — Parallel workers (tmux + worktree isolation)",
                    "  autopilot — Sequential multi-task",
                    "  pipeline  — 5-stage quality gates",
                    "  swarm     — Multi-angle parallel analysis",
                    "  qa        — Test-fix-retest cycle",
                    "  ralplan   — Consensus planning",
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
                "5. **TODO Scan**: Check for unresolved TODOs in changed files",
                "   → git diff --name-only | xargs grep -n 'TODO\\|FIXME\\|HACK\\|XXX'",
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
    // Notify user that the shortcut was caught
    const label = context
        ? `[#${shortcutName}] ${context.slice(0, 60)}${context.length > 60 ? "..." : ""}`
        : `[#${shortcutName}]`;
    writeError(label);
    // tmux popup for visible feedback (fully detached via nohup + &)
    try {
        const { execSync, spawn } = await import("child_process");
        const inTmux = process.env.TMUX || (() => {
            try {
                execSync("tmux info", { stdio: "ignore" });
                return true;
            }
            catch {
                return false;
            }
        })();
        if (inTmux) {
            const safeLabel = label.replace(/'/g, "'\\''");
            const [bg, fg, icon] = SHORTCUT_THEMES[shortcutName] || [24, 230, "⚡"];
            const child = spawn("sh", ["-c",
                `nohup tmux display-popup -E -w 60 -h 7 "printf '\\033[48;5;${bg}m'; clear; printf '\\033[48;5;${bg};38;5;${fg};1m\\n\\n    ${icon} %s\\n\\n' '${safeLabel}'; sleep 2" </dev/null >/dev/null 2>&1 &`,
            ], { detached: true, stdio: "ignore" });
            child.unref();
        }
    }
    catch { }
    writeOutput({
        hookSpecificOutput: {
            hookEventName: "UserPromptSubmit",
            additionalContext: output,
        },
    });
}
main();
