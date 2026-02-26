// Tests for src/lib/quality/scorer.ts
// Run: npx tsx --test src/lib/__tests__/quality-scorer.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadQualityScore, recordEditResult, recordBuildResult, recordTestResult, recordSlopComment, calculateScore, formatScoreReport, } from "../quality/scorer.js";
function makeTmpDir() {
    return mkdtempSync(join(tmpdir(), "reforge-quality-test-"));
}
describe("quality scorer — loadQualityScore", () => {
    it("returns default state when no file exists", () => {
        const cwd = makeTmpDir();
        try {
            const state = loadQualityScore(cwd);
            assert.equal(state.totalEdits, 0);
            assert.equal(state.successfulEdits, 0);
            assert.equal(state.buildPassed, null);
            assert.equal(state.testsPassed, null);
            assert.equal(state.slopComments, 0);
        }
        finally {
            rmSync(cwd, { recursive: true });
        }
    });
});
describe("quality scorer — recordEditResult", () => {
    it("success increments both totalEdits and successfulEdits", () => {
        const cwd = makeTmpDir();
        try {
            recordEditResult(cwd, true);
            const state = loadQualityScore(cwd);
            assert.equal(state.totalEdits, 1);
            assert.equal(state.successfulEdits, 1);
        }
        finally {
            rmSync(cwd, { recursive: true });
        }
    });
    it("failure increments totalEdits only", () => {
        const cwd = makeTmpDir();
        try {
            recordEditResult(cwd, false);
            const state = loadQualityScore(cwd);
            assert.equal(state.totalEdits, 1);
            assert.equal(state.successfulEdits, 0);
        }
        finally {
            rmSync(cwd, { recursive: true });
        }
    });
    it("accumulates over multiple calls", () => {
        const cwd = makeTmpDir();
        try {
            recordEditResult(cwd, true);
            recordEditResult(cwd, true);
            recordEditResult(cwd, false);
            const state = loadQualityScore(cwd);
            assert.equal(state.totalEdits, 3);
            assert.equal(state.successfulEdits, 2);
        }
        finally {
            rmSync(cwd, { recursive: true });
        }
    });
});
describe("quality scorer — recordBuildResult", () => {
    it("records build pass", () => {
        const cwd = makeTmpDir();
        try {
            recordBuildResult(cwd, true);
            const state = loadQualityScore(cwd);
            assert.equal(state.buildPassed, true);
        }
        finally {
            rmSync(cwd, { recursive: true });
        }
    });
    it("records build failure", () => {
        const cwd = makeTmpDir();
        try {
            recordBuildResult(cwd, false);
            const state = loadQualityScore(cwd);
            assert.equal(state.buildPassed, false);
        }
        finally {
            rmSync(cwd, { recursive: true });
        }
    });
    it("overwrites previous result", () => {
        const cwd = makeTmpDir();
        try {
            recordBuildResult(cwd, true);
            recordBuildResult(cwd, false);
            const state = loadQualityScore(cwd);
            assert.equal(state.buildPassed, false);
        }
        finally {
            rmSync(cwd, { recursive: true });
        }
    });
});
describe("quality scorer — recordTestResult", () => {
    it("records test pass", () => {
        const cwd = makeTmpDir();
        try {
            recordTestResult(cwd, true);
            const state = loadQualityScore(cwd);
            assert.equal(state.testsPassed, true);
        }
        finally {
            rmSync(cwd, { recursive: true });
        }
    });
    it("records test failure", () => {
        const cwd = makeTmpDir();
        try {
            recordTestResult(cwd, false);
            const state = loadQualityScore(cwd);
            assert.equal(state.testsPassed, false);
        }
        finally {
            rmSync(cwd, { recursive: true });
        }
    });
});
describe("quality scorer — recordSlopComment", () => {
    it("increments slop comment count", () => {
        const cwd = makeTmpDir();
        try {
            recordSlopComment(cwd);
            recordSlopComment(cwd);
            const state = loadQualityScore(cwd);
            assert.equal(state.slopComments, 2);
        }
        finally {
            rmSync(cwd, { recursive: true });
        }
    });
});
describe("quality scorer — calculateScore", () => {
    it("default state yields 50 overall (all neutral)", () => {
        const cwd = makeTmpDir();
        try {
            const scores = calculateScore(cwd);
            // editSuccessRate=50, buildHealth=50, testHealth=50, codeCleanness=100
            // 50*0.30 + 50*0.25 + 50*0.25 + 100*0.20 = 15+12.5+12.5+20 = 60
            assert.equal(scores.editSuccessRate, 50);
            assert.equal(scores.buildHealth, 50);
            assert.equal(scores.testHealth, 50);
            assert.equal(scores.codeCleanness, 100);
            assert.equal(scores.overall, 60);
        }
        finally {
            rmSync(cwd, { recursive: true });
        }
    });
    it("perfect state yields 100 overall", () => {
        const cwd = makeTmpDir();
        try {
            recordEditResult(cwd, true);
            recordBuildResult(cwd, true);
            recordTestResult(cwd, true);
            const scores = calculateScore(cwd);
            assert.equal(scores.editSuccessRate, 100);
            assert.equal(scores.buildHealth, 100);
            assert.equal(scores.testHealth, 100);
            assert.equal(scores.codeCleanness, 100);
            assert.equal(scores.overall, 100);
        }
        finally {
            rmSync(cwd, { recursive: true });
        }
    });
    it("worst state yields 0 overall", () => {
        const cwd = makeTmpDir();
        try {
            recordEditResult(cwd, false);
            recordBuildResult(cwd, false);
            recordTestResult(cwd, false);
            for (let i = 0; i < 10; i++)
                recordSlopComment(cwd);
            const scores = calculateScore(cwd);
            assert.equal(scores.editSuccessRate, 0);
            assert.equal(scores.buildHealth, 0);
            assert.equal(scores.testHealth, 0);
            assert.equal(scores.codeCleanness, 0);
            assert.equal(scores.overall, 0);
        }
        finally {
            rmSync(cwd, { recursive: true });
        }
    });
    it("slop comments reduce cleanness by 10 each, min 0", () => {
        const cwd = makeTmpDir();
        try {
            for (let i = 0; i < 3; i++)
                recordSlopComment(cwd);
            const scores = calculateScore(cwd);
            assert.equal(scores.codeCleanness, 70);
        }
        finally {
            rmSync(cwd, { recursive: true });
        }
    });
    it("slop comments beyond 10 still cap at 0", () => {
        const cwd = makeTmpDir();
        try {
            for (let i = 0; i < 15; i++)
                recordSlopComment(cwd);
            const scores = calculateScore(cwd);
            assert.equal(scores.codeCleanness, 0);
        }
        finally {
            rmSync(cwd, { recursive: true });
        }
    });
    it("edit success rate is percentage of successful edits", () => {
        const cwd = makeTmpDir();
        try {
            recordEditResult(cwd, true);
            recordEditResult(cwd, true);
            recordEditResult(cwd, false);
            recordEditResult(cwd, false);
            const scores = calculateScore(cwd);
            assert.equal(scores.editSuccessRate, 50);
        }
        finally {
            rmSync(cwd, { recursive: true });
        }
    });
    it("weights sum correctly (0.30 + 0.25 + 0.25 + 0.20 = 1.0)", () => {
        const cwd = makeTmpDir();
        try {
            // All components at 100
            recordEditResult(cwd, true);
            recordBuildResult(cwd, true);
            recordTestResult(cwd, true);
            const scores = calculateScore(cwd);
            // 100*0.30 + 100*0.25 + 100*0.25 + 100*0.20 = 100
            assert.equal(scores.overall, 100);
        }
        finally {
            rmSync(cwd, { recursive: true });
        }
    });
    it("mixed scenario with partial successes", () => {
        const cwd = makeTmpDir();
        try {
            // 3/4 edits successful = 75
            recordEditResult(cwd, true);
            recordEditResult(cwd, true);
            recordEditResult(cwd, true);
            recordEditResult(cwd, false);
            recordBuildResult(cwd, true); // 100
            recordTestResult(cwd, false); // 0
            recordSlopComment(cwd); // cleanness = 90
            const scores = calculateScore(cwd);
            assert.equal(scores.editSuccessRate, 75);
            assert.equal(scores.buildHealth, 100);
            assert.equal(scores.testHealth, 0);
            assert.equal(scores.codeCleanness, 90);
            // 75*0.30 + 100*0.25 + 0*0.25 + 90*0.20 = 22.5+25+0+18 = 65.5 → 66
            assert.equal(scores.overall, 66);
        }
        finally {
            rmSync(cwd, { recursive: true });
        }
    });
});
describe("quality scorer — formatScoreReport", () => {
    it("includes overall score header", () => {
        const cwd = makeTmpDir();
        try {
            const report = formatScoreReport(cwd);
            assert.ok(report.includes("Quality Score:"));
            assert.ok(report.includes("/100"));
        }
        finally {
            rmSync(cwd, { recursive: true });
        }
    });
    it("shows 'no edits yet' when no edits recorded", () => {
        const cwd = makeTmpDir();
        try {
            const report = formatScoreReport(cwd);
            assert.ok(report.includes("no edits yet"));
        }
        finally {
            rmSync(cwd, { recursive: true });
        }
    });
    it("shows edit fraction when edits exist", () => {
        const cwd = makeTmpDir();
        try {
            recordEditResult(cwd, true);
            recordEditResult(cwd, false);
            const report = formatScoreReport(cwd);
            assert.ok(report.includes("1/2 successful"));
        }
        finally {
            rmSync(cwd, { recursive: true });
        }
    });
    it("shows 'not run yet' for build when not recorded", () => {
        const cwd = makeTmpDir();
        try {
            const report = formatScoreReport(cwd);
            assert.ok(report.includes("not run yet"));
        }
        finally {
            rmSync(cwd, { recursive: true });
        }
    });
    it("shows 'passing' for build when passed", () => {
        const cwd = makeTmpDir();
        try {
            recordBuildResult(cwd, true);
            const report = formatScoreReport(cwd);
            assert.ok(report.includes("passing"));
        }
        finally {
            rmSync(cwd, { recursive: true });
        }
    });
    it("shows 'failing' for build when failed", () => {
        const cwd = makeTmpDir();
        try {
            recordBuildResult(cwd, false);
            const report = formatScoreReport(cwd);
            assert.ok(report.includes("failing"));
        }
        finally {
            rmSync(cwd, { recursive: true });
        }
    });
    it("shows 'clean' when no slop comments", () => {
        const cwd = makeTmpDir();
        try {
            const report = formatScoreReport(cwd);
            assert.ok(report.includes("clean"));
        }
        finally {
            rmSync(cwd, { recursive: true });
        }
    });
    it("shows slop comment count with correct pluralization", () => {
        const cwd = makeTmpDir();
        try {
            recordSlopComment(cwd);
            let report = formatScoreReport(cwd);
            assert.ok(report.includes("1 slop comment") && !report.includes("comments"));
            recordSlopComment(cwd);
            report = formatScoreReport(cwd);
            assert.ok(report.includes("2 slop comments"));
        }
        finally {
            rmSync(cwd, { recursive: true });
        }
    });
    it("includes a tip based on worst component", () => {
        const cwd = makeTmpDir();
        try {
            recordBuildResult(cwd, false);
            const report = formatScoreReport(cwd);
            assert.ok(report.includes("Tip:"));
            assert.ok(report.includes("build errors"));
        }
        finally {
            rmSync(cwd, { recursive: true });
        }
    });
    it("shows keep-it-up tip when all at 100", () => {
        const cwd = makeTmpDir();
        try {
            recordEditResult(cwd, true);
            recordBuildResult(cwd, true);
            recordTestResult(cwd, true);
            const report = formatScoreReport(cwd);
            assert.ok(report.includes("Keep it up"));
        }
        finally {
            rmSync(cwd, { recursive: true });
        }
    });
});
