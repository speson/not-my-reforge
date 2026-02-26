// Tests for src/lib/deliverable/checker.ts
// Run: npx tsx --test src/lib/__tests__/deliverable-checker.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { verifyDeliverable, verifyAll } from "../deliverable/checker.js";
function makeTmpDir() {
    return mkdtempSync(join(tmpdir(), "reforge-deliv-test-"));
}
describe("deliverable checker — verifyCriterion via verifyDeliverable", () => {
    describe("file_exists criterion", () => {
        it("passes when file exists", () => {
            const cwd = makeTmpDir();
            try {
                const filePath = join(cwd, "output.txt");
                writeFileSync(filePath, "hello");
                const deliverable = {
                    name: "Output file",
                    description: "Generates output file",
                    criteria: [
                        { type: "file_exists", description: "output file", value: "output.txt" },
                    ],
                };
                const results = verifyDeliverable(cwd, deliverable);
                assert.equal(results.length, 1);
                assert.equal(results[0].passed, true);
                assert.equal(results[0].deliverable, "Output file");
                assert.equal(results[0].criterion, "output file");
            }
            finally {
                rmSync(cwd, { recursive: true });
            }
        });
        it("fails when file does not exist", () => {
            const cwd = makeTmpDir();
            try {
                const deliverable = {
                    name: "Missing file",
                    description: "Checks missing file",
                    criteria: [
                        { type: "file_exists", description: "missing file check", value: "nonexistent.txt" },
                    ],
                };
                const results = verifyDeliverable(cwd, deliverable);
                assert.equal(results.length, 1);
                assert.equal(results[0].passed, false);
                assert.equal(results[0].detail, "Not found");
            }
            finally {
                rmSync(cwd, { recursive: true });
            }
        });
        it("passes when file exists at absolute path", () => {
            const cwd = makeTmpDir();
            try {
                const absPath = join(cwd, "absolute.txt");
                writeFileSync(absPath, "data");
                const deliverable = {
                    name: "Absolute path test",
                    description: "Tests absolute path check",
                    criteria: [
                        { type: "file_exists", description: "absolute path file", value: absPath },
                    ],
                };
                const results = verifyDeliverable(cwd, deliverable);
                assert.equal(results[0].passed, true);
            }
            finally {
                rmSync(cwd, { recursive: true });
            }
        });
    });
    describe("custom command criterion", () => {
        it("passes when command exits 0", () => {
            const cwd = makeTmpDir();
            try {
                const deliverable = {
                    name: "Echo test",
                    description: "Runs echo command",
                    criteria: [
                        { type: "custom", description: "echo passes", value: "echo hello" },
                    ],
                };
                const results = verifyDeliverable(cwd, deliverable);
                assert.equal(results[0].passed, true);
                assert.equal(results[0].detail, "Passed");
            }
            finally {
                rmSync(cwd, { recursive: true });
            }
        });
        it("fails when command exits non-zero", () => {
            const cwd = makeTmpDir();
            try {
                const deliverable = {
                    name: "Failing command",
                    description: "Runs failing command",
                    criteria: [
                        { type: "custom", description: "false command", value: "false" },
                    ],
                };
                const results = verifyDeliverable(cwd, deliverable);
                assert.equal(results[0].passed, false);
            }
            finally {
                rmSync(cwd, { recursive: true });
            }
        });
        it("fails when command is not found", () => {
            const cwd = makeTmpDir();
            try {
                const deliverable = {
                    name: "Bad command",
                    description: "Runs non-existent command",
                    criteria: [
                        { type: "custom", description: "nonexistent cmd", value: "nonexistentcmd_xyz_12345" },
                    ],
                };
                const results = verifyDeliverable(cwd, deliverable);
                assert.equal(results[0].passed, false);
            }
            finally {
                rmSync(cwd, { recursive: true });
            }
        });
        it("passes for test_passes type (same as custom — runs command)", () => {
            const cwd = makeTmpDir();
            try {
                const deliverable = {
                    name: "Test passes",
                    description: "Test suite",
                    criteria: [
                        { type: "test_passes", description: "run echo as test", value: "echo ok" },
                    ],
                };
                const results = verifyDeliverable(cwd, deliverable);
                assert.equal(results[0].passed, true);
            }
            finally {
                rmSync(cwd, { recursive: true });
            }
        });
    });
});
describe("deliverable checker — verifyAll aggregates results", () => {
    it("returns allPassed=true when all criteria pass", () => {
        const cwd = makeTmpDir();
        try {
            writeFileSync(join(cwd, "a.txt"), "a");
            writeFileSync(join(cwd, "b.txt"), "b");
            const deliverables = [
                {
                    name: "File A",
                    description: "Check file A",
                    criteria: [{ type: "file_exists", description: "a.txt exists", value: "a.txt" }],
                },
                {
                    name: "File B",
                    description: "Check file B",
                    criteria: [{ type: "file_exists", description: "b.txt exists", value: "b.txt" }],
                },
            ];
            const report = verifyAll(cwd, deliverables);
            assert.equal(report.allPassed, true);
            assert.equal(report.passCount, 2);
            assert.equal(report.failCount, 0);
            assert.ok(report.summary.includes("2"));
        }
        finally {
            rmSync(cwd, { recursive: true });
        }
    });
    it("returns allPassed=false when any criterion fails", () => {
        const cwd = makeTmpDir();
        try {
            writeFileSync(join(cwd, "exists.txt"), "exists");
            const deliverables = [
                {
                    name: "Existing file",
                    description: "Check existing file",
                    criteria: [{ type: "file_exists", description: "exists.txt", value: "exists.txt" }],
                },
                {
                    name: "Missing file",
                    description: "Check missing file",
                    criteria: [{ type: "file_exists", description: "missing.txt", value: "missing.txt" }],
                },
            ];
            const report = verifyAll(cwd, deliverables);
            assert.equal(report.allPassed, false);
            assert.equal(report.passCount, 1);
            assert.equal(report.failCount, 1);
            assert.ok(report.summary.includes("1/2"));
        }
        finally {
            rmSync(cwd, { recursive: true });
        }
    });
    it("returns empty report for empty deliverables list", () => {
        const cwd = makeTmpDir();
        try {
            const report = verifyAll(cwd, []);
            assert.equal(report.allPassed, true);
            assert.equal(report.passCount, 0);
            assert.equal(report.failCount, 0);
            assert.equal(report.deliverables.length, 0);
        }
        finally {
            rmSync(cwd, { recursive: true });
        }
    });
    it("aggregates multiple criteria from multiple deliverables", () => {
        const cwd = makeTmpDir();
        try {
            writeFileSync(join(cwd, "f1.txt"), "x");
            const deliverables = [
                {
                    name: "D1",
                    description: "Deliverable 1",
                    criteria: [
                        { type: "file_exists", description: "f1 exists", value: "f1.txt" },
                        { type: "file_exists", description: "f2 missing", value: "f2.txt" },
                    ],
                },
                {
                    name: "D2",
                    description: "Deliverable 2",
                    criteria: [
                        { type: "custom", description: "echo ok", value: "echo ok" },
                    ],
                },
            ];
            const report = verifyAll(cwd, deliverables);
            assert.equal(report.deliverables.length, 3);
            assert.equal(report.passCount, 2);
            assert.equal(report.failCount, 1);
            assert.equal(report.allPassed, false);
            // Deliverable names should be set correctly
            assert.equal(report.deliverables[0].deliverable, "D1");
            assert.equal(report.deliverables[1].deliverable, "D1");
            assert.equal(report.deliverables[2].deliverable, "D2");
        }
        finally {
            rmSync(cwd, { recursive: true });
        }
    });
    it("summary message reflects pass count when all pass", () => {
        const cwd = makeTmpDir();
        try {
            const deliverables = [
                {
                    name: "Echo",
                    description: "Runs echo",
                    criteria: [
                        { type: "custom", description: "echo 1", value: "echo 1" },
                        { type: "custom", description: "echo 2", value: "echo 2" },
                    ],
                },
            ];
            const report = verifyAll(cwd, deliverables);
            assert.ok(report.summary.includes("All 2 criteria passed"));
        }
        finally {
            rmSync(cwd, { recursive: true });
        }
    });
});
