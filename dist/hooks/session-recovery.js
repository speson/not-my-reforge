// session-recovery.ts — Detect session errors at Stop and save recovery state
// Event: Stop (async, non-blocking)
import { readStdin, writeError } from "../lib/io.js";
import { writeDataFile } from "../lib/storage.js";
import { loadState as loadCircuitBreaker } from "../lib/circuit-breaker/tracker.js";
const ERROR_PATTERNS = {
    context_overflow: [
        /context (window|length) (exceeded|overflow|full)/i,
        /prompt is too long/i,
        /maximum context length/i,
        /token limit exceeded/i,
    ],
    build_failure: [
        /\bnpm run build\b.*failed/i,
        /\btsc\b.*error/i,
        /TypeScript.*error/i,
        /compilation (failed|error)/i,
        /build (failed|error)/i,
        /error TS\d+/i,
    ],
    test_failure: [
        /\bnpm (run )?test\b.*failed/i,
        /\d+ (test(s)?|spec(s)?) failed/i,
        /FAIL\s+\S+\.test\./i,
        /AssertionError/i,
        /test suite failed/i,
    ],
    repeated_tool_failures: [
        /consecutive failures/i,
        /circuit breaker/i,
    ],
    unknown: [],
};
function extractTextFromMessage(msg) {
    if (typeof msg.content === "string")
        return msg.content;
    if (Array.isArray(msg.content)) {
        return msg.content
            .map((c) => {
            if (c.type === "text" && c.text)
                return c.text;
            if (c.type === "tool_result" && c.content)
                return c.content;
            return "";
        })
            .filter(Boolean)
            .join("\n");
    }
    return "";
}
function detectErrorType(text) {
    for (const [errorType, patterns] of Object.entries(ERROR_PATTERNS)) {
        if (errorType === "unknown")
            continue;
        if (patterns.some((p) => p.test(text))) {
            return errorType;
        }
    }
    return null;
}
function buildRecoveryAction(errorType, circuitBreakerSummary) {
    switch (errorType) {
        case "context_overflow":
            return "Run /compact to reduce context before continuing. Consider breaking remaining work into smaller tasks.";
        case "repeated_tool_failures":
            return `${circuitBreakerSummary ? circuitBreakerSummary + " " : ""}Try a different approach or tool. Avoid repeating the same failing strategy.`;
        case "build_failure":
            return "Run `npm run build` (or equivalent) and fix TypeScript/compilation errors before proceeding. Check error messages carefully.";
        case "test_failure":
            return "Run the failing tests individually to isolate the issue. Check recent file changes that may have caused the regression.";
        default:
            return "Review the last error and ensure the task is fully completed before proceeding.";
    }
}
function extractRecentFiles(transcript) {
    const files = new Set();
    const filePattern = /(?:file_path|path)["']?\s*[:=]\s*["']([^"'\n]+\.\w+)/g;
    const recent = transcript.slice(-20);
    for (const msg of recent) {
        const text = extractTextFromMessage(msg);
        let match;
        while ((match = filePattern.exec(text)) !== null) {
            const fp = match[1];
            if (!fp.startsWith("/tmp") && !fp.includes("node_modules")) {
                files.add(fp);
            }
        }
    }
    return [...files].slice(0, 10);
}
async function main() {
    const input = await readStdin();
    const cwd = input.cwd;
    if (!cwd)
        process.exit(0);
    const transcript = input.transcript ?? [];
    if (transcript.length === 0)
        process.exit(0);
    const lastMessages = transcript.slice(-5);
    const combinedText = lastMessages.map(extractTextFromMessage).join("\n");
    const errorType = detectErrorType(combinedText);
    if (!errorType) {
        process.exit(0);
    }
    let circuitBreakerSummary = "";
    if (errorType === "repeated_tool_failures") {
        try {
            const cbState = loadCircuitBreaker(cwd);
            const entries = Object.entries(cbState.failures);
            if (entries.length > 0) {
                const top = entries
                    .sort((a, b) => b[1].count - a[1].count)
                    .slice(0, 3)
                    .map(([tool, entry]) => `${tool} (${entry.count}x)`)
                    .join(", ");
                circuitBreakerSummary = `Failing tools: ${top}.`;
            }
        }
        catch {
            // ignore
        }
    }
    const lastAssistant = [...transcript].reverse().find((m) => m.role === "assistant");
    const errorSummary = lastAssistant
        ? extractTextFromMessage(lastAssistant).slice(0, 300).replace(/\n+/g, " ")
        : combinedText.slice(0, 300).replace(/\n+/g, " ");
    const filesBeingWorkedOn = extractRecentFiles(transcript);
    const recoveryAction = buildRecoveryAction(errorType, circuitBreakerSummary);
    const recoveryState = {
        detectedAt: new Date().toISOString(),
        errorType,
        errorSummary,
        recoveryAction,
        filesBeingWorkedOn,
    };
    try {
        writeDataFile(cwd, "recovery-state.json", recoveryState);
    }
    catch (e) {
        writeError(`[session-recovery] Failed to write recovery state: ${e}`);
    }
}
main();
