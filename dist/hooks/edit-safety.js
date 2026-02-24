// edit-safety.ts — Smart recovery guidance when Edit tool fails
// Event: PostToolUse (Edit)
// Enhanced: error classification, retry strategy, git diff context, circuit-breaker integration
import { readStdin, writeOutput } from "../lib/io.js";
import { recordFailure, recordSuccess } from "../lib/circuit-breaker/tracker.js";
import { existsSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { basename } from "node:path";
function classifyError(errorMsg) {
    const lower = errorMsg.toLowerCase();
    if (lower.includes("not found") || lower.includes("no match") || lower.includes("could not find"))
        return "not_found";
    if (lower.includes("ambiguous") || lower.includes("multiple") || lower.includes("not unique"))
        return "ambiguous";
    if (lower.includes("whitespace") || lower.includes("indentation") || lower.includes("tab"))
        return "whitespace";
    if (lower.includes("changed") || lower.includes("stale") || lower.includes("modified"))
        return "stale";
    return "unknown";
}
function getGitDiffContext(filePath, cwd) {
    if (!cwd)
        return null;
    try {
        const isGit = execSync("git rev-parse --is-inside-work-tree", {
            cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"],
        }).trim();
        if (isGit !== "true")
            return null;
        const diff = execSync(`git diff -- "${filePath}"`, {
            cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"],
        }).trim();
        if (!diff)
            return null;
        // Truncate to first 30 lines to keep context manageable
        const lines = diff.split("\n");
        if (lines.length > 30) {
            return lines.slice(0, 30).join("\n") + `\n... (${lines.length - 30} more lines)`;
        }
        return diff;
    }
    catch {
        return null;
    }
}
function getFileSnippet(filePath, oldString) {
    if (!existsSync(filePath))
        return null;
    try {
        const content = readFileSync(filePath, "utf-8");
        const lines = content.split("\n");
        // Find the closest match to old_string
        const searchTerms = oldString.trim().split("\n").filter(Boolean);
        if (searchTerms.length === 0)
            return null;
        const firstTerm = searchTerms[0].trim();
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(firstTerm)) {
                const start = Math.max(0, i - 2);
                const end = Math.min(lines.length, i + searchTerms.length + 3);
                return lines.slice(start, end)
                    .map((l, idx) => `${start + idx + 1}: ${l}`)
                    .join("\n");
            }
        }
        return null;
    }
    catch {
        return null;
    }
}
const RECOVERY_STRATEGIES = {
    not_found: [
        "The old_string was not found in the file. The file content may have changed since you last read it.",
        "Recovery:",
        "1. Re-read the file with the Read tool to get the CURRENT content",
        "2. Copy the exact text from the Read output (preserving all whitespace)",
        "3. Retry the Edit with the corrected old_string",
        "IMPORTANT: Do NOT guess or reconstruct the content from memory.",
    ],
    ambiguous: [
        "The old_string matches multiple locations in the file.",
        "Recovery:",
        "1. Include MORE surrounding context in old_string to make it unique",
        "2. Add 2-3 lines before and after the target section",
        "3. If the pattern is truly repeated, target a specific instance by including unique neighboring code",
    ],
    whitespace: [
        "Whitespace or indentation mismatch between old_string and actual file content.",
        "Recovery:",
        "1. Re-read the file — pay close attention to tabs vs spaces",
        "2. Copy the exact indentation from the Read output",
        "3. Check if the file uses tabs (\\t) or spaces for indentation",
        "4. Ensure trailing whitespace matches exactly",
    ],
    stale: [
        "The file has been modified since you last read it (possibly by another tool or process).",
        "Recovery:",
        "1. Re-read the file to get the latest version",
        "2. Check git diff to understand what changed",
        "3. Rebase your edit on the current content",
    ],
    unknown: [
        "Edit failed for an unexpected reason.",
        "Recovery:",
        "1. Re-read the file to get current content",
        "2. Use a larger unique context in old_string to avoid ambiguity",
        "3. Check for whitespace/indentation mismatches",
        "4. If the file structure changed significantly, consider a targeted Write for that section",
    ],
};
async function main() {
    const input = await readStdin();
    const cwd = input.cwd || "";
    const isError = input.tool_response?.is_error;
    // Track success to reset circuit breaker
    if (!isError) {
        if (cwd)
            recordSuccess(cwd, "Edit");
        process.exit(0);
    }
    const errorMsg = input.tool_response?.content ||
        input.tool_response?.error ||
        "Unknown error";
    const filePath = input.tool_input?.file_path || "unknown";
    const oldString = input.tool_input?.old_string || "";
    const fileName = basename(filePath);
    // Classify the error
    const errorClass = classifyError(errorMsg);
    const strategy = RECOVERY_STRATEGIES[errorClass];
    // Build context
    const sections = [
        `Edit failed on ${fileName} [${errorClass}]: ${errorMsg}`,
        "",
        ...strategy,
    ];
    // Add file snippet showing what's actually at the target location
    if (oldString && filePath !== "unknown") {
        const snippet = getFileSnippet(filePath, oldString);
        if (snippet) {
            sections.push("", "Actual file content near the target:", snippet);
        }
    }
    // Add git diff context if available
    if (cwd) {
        const diff = getGitDiffContext(filePath, cwd);
        if (diff) {
            sections.push("", "Recent changes to this file (git diff):", diff);
        }
    }
    // Circuit breaker integration
    if (cwd) {
        const { count, escalation } = recordFailure(cwd, "Edit", errorMsg);
        if (escalation) {
            sections.push("", `[Circuit Breaker] ${escalation}`);
        }
        else if (count >= 2) {
            sections.push("", `Note: ${count} consecutive Edit failures on this session. Consider reading the file again before retrying.`);
        }
    }
    sections.push("", "Do NOT retry the same edit without re-reading the file first.");
    writeOutput({
        hookSpecificOutput: {
            hookEventName: "PostToolUse",
            additionalContext: sections.join("\n"),
        },
    });
}
main();
