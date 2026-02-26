// Tests for src/lib/circuit-breaker/tracker.ts
// Run: npx tsx --test src/lib/__tests__/circuit-breaker.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { recordFailure, recordSuccess, loadState, } from "../circuit-breaker/tracker.js";
import { writeDataFile } from "../storage.js";
// Each test suite gets its own isolated temp dir so tests don't share state
function makeTmpDir() {
    return mkdtempSync(join(tmpdir(), "reforge-cb-test-"));
}
describe("circuit-breaker tracker", () => {
    describe("recordFailure", () => {
        it("first failure returns count 1 and no escalation", () => {
            const cwd = makeTmpDir();
            try {
                const result = recordFailure(cwd, "Bash", "command not found");
                assert.equal(result.count, 1);
                assert.equal(result.escalation, null);
            }
            finally {
                rmSync(cwd, { recursive: true });
            }
        });
        it("increments count on repeated failures for same tool", () => {
            const cwd = makeTmpDir();
            try {
                recordFailure(cwd, "Bash", "err1");
                recordFailure(cwd, "Bash", "err2");
                const result = recordFailure(cwd, "Bash", "err3");
                assert.equal(result.count, 3);
            }
            finally {
                rmSync(cwd, { recursive: true });
            }
        });
        it("different tools track counts independently", () => {
            const cwd = makeTmpDir();
            try {
                recordFailure(cwd, "Bash", "err");
                recordFailure(cwd, "Bash", "err");
                const resultWrite = recordFailure(cwd, "Write", "err");
                assert.equal(resultWrite.count, 1);
                const state = loadState(cwd);
                assert.equal(state.failures["Bash"].count, 2);
                assert.equal(state.failures["Write"].count, 1);
            }
            finally {
                rmSync(cwd, { recursive: true });
            }
        });
        it("escalation message at threshold 3", () => {
            const cwd = makeTmpDir();
            try {
                recordFailure(cwd, "Bash", "e");
                recordFailure(cwd, "Bash", "e");
                const result = recordFailure(cwd, "Bash", "e");
                assert.equal(result.count, 3);
                assert.ok(result.escalation !== null, "should have escalation at count 3");
                assert.ok(result.escalation.includes("model tier"), "count-3 escalation mentions model tier");
            }
            finally {
                rmSync(cwd, { recursive: true });
            }
        });
        it("escalation message at threshold 5 mentions fundamentally different approach", () => {
            const cwd = makeTmpDir();
            try {
                for (let i = 0; i < 4; i++)
                    recordFailure(cwd, "Bash", "e");
                const result = recordFailure(cwd, "Bash", "e");
                assert.equal(result.count, 5);
                assert.ok(result.escalation !== null);
                assert.ok(result.escalation.includes("fundamentally different"), "count-5 escalation mentions fundamentally different");
            }
            finally {
                rmSync(cwd, { recursive: true });
            }
        });
        it("escalation message at threshold 7 asks for user guidance", () => {
            const cwd = makeTmpDir();
            try {
                for (let i = 0; i < 6; i++)
                    recordFailure(cwd, "Bash", "e");
                const result = recordFailure(cwd, "Bash", "e");
                assert.equal(result.count, 7);
                assert.ok(result.escalation !== null);
                assert.ok(result.escalation.includes("ask the user"), "count-7 escalation asks for user guidance");
            }
            finally {
                rmSync(cwd, { recursive: true });
            }
        });
        it("count 2 has no escalation (below threshold 3)", () => {
            const cwd = makeTmpDir();
            try {
                recordFailure(cwd, "Bash", "e");
                const result = recordFailure(cwd, "Bash", "e");
                assert.equal(result.count, 2);
                assert.equal(result.escalation, null);
            }
            finally {
                rmSync(cwd, { recursive: true });
            }
        });
    });
    describe("recordSuccess", () => {
        it("success resets failure count for that tool", () => {
            const cwd = makeTmpDir();
            try {
                recordFailure(cwd, "Bash", "e");
                recordFailure(cwd, "Bash", "e");
                recordSuccess(cwd, "Bash");
                const state = loadState(cwd);
                assert.equal(state.failures["Bash"], undefined);
            }
            finally {
                rmSync(cwd, { recursive: true });
            }
        });
        it("success on one tool does not affect another tool's failures", () => {
            const cwd = makeTmpDir();
            try {
                recordFailure(cwd, "Bash", "e");
                recordFailure(cwd, "Bash", "e");
                recordFailure(cwd, "Write", "e");
                recordSuccess(cwd, "Bash");
                const state = loadState(cwd);
                assert.equal(state.failures["Bash"], undefined);
                assert.equal(state.failures["Write"].count, 1);
            }
            finally {
                rmSync(cwd, { recursive: true });
            }
        });
        it("next failure after success starts count at 1 again", () => {
            const cwd = makeTmpDir();
            try {
                recordFailure(cwd, "Bash", "e");
                recordFailure(cwd, "Bash", "e");
                recordSuccess(cwd, "Bash");
                const result = recordFailure(cwd, "Bash", "new error");
                assert.equal(result.count, 1);
            }
            finally {
                rmSync(cwd, { recursive: true });
            }
        });
    });
    describe("auto-reset after timeout", () => {
        it("failure older than 30 minutes resets count to 1", () => {
            const cwd = makeTmpDir();
            try {
                const staleTimestamp = Date.now() - 31 * 60 * 1000; // 31 minutes ago
                writeDataFile(cwd, "circuit-breaker.json", {
                    failures: {
                        Bash: { count: 5, lastError: "old error", timestamp: staleTimestamp },
                    },
                });
                // Recording a new failure should reset the stale entry
                const result = recordFailure(cwd, "Bash", "new error");
                assert.equal(result.count, 1, "stale failure count should reset to 1");
                assert.equal(result.escalation, null, "count 1 should have no escalation");
            }
            finally {
                rmSync(cwd, { recursive: true });
            }
        });
        it("recent failure (within 30 min) does NOT reset", () => {
            const cwd = makeTmpDir();
            try {
                const recentTimestamp = Date.now() - 5 * 60 * 1000; // 5 minutes ago
                writeDataFile(cwd, "circuit-breaker.json", {
                    failures: {
                        Bash: { count: 5, lastError: "old error", timestamp: recentTimestamp },
                    },
                });
                const result = recordFailure(cwd, "Bash", "new error");
                assert.equal(result.count, 6, "recent failure should increment existing count");
            }
            finally {
                rmSync(cwd, { recursive: true });
            }
        });
    });
});
