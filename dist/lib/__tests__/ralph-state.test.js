// Tests for src/lib/ralph/state.ts
// Run: npx tsx --test src/lib/__tests__/ralph-state.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { advanceIteration, recordFailure, recordSuccess, recordApproach, isExhausted, getAdaptationStrategy, } from "../ralph/state.js";
import { createRalphState } from "../ralph/types.js";
function makeState(overrides = {}) {
    return { ...createRalphState("test task", 20, null), ...overrides };
}
describe("ralph state", () => {
    describe("createRalphState (initial state)", () => {
        it("creates active state with expected defaults", () => {
            const state = createRalphState("fix the bug", 15, "npm test");
            assert.equal(state.active, true);
            assert.equal(state.task, "fix the bug");
            assert.equal(state.maxIterations, 15);
            assert.equal(state.verifyCommand, "npm test");
            assert.equal(state.iteration, 0);
            assert.equal(state.status, "running");
            assert.equal(state.consecutiveFailures, 0);
            assert.equal(state.lastFailureReason, "");
            assert.deepEqual(state.approaches, []);
        });
        it("defaults maxIterations to 20 when not provided", () => {
            const state = createRalphState("task");
            assert.equal(state.maxIterations, 20);
        });
        it("defaults verifyCommand to null when not provided", () => {
            const state = createRalphState("task");
            assert.equal(state.verifyCommand, null);
        });
    });
    describe("advanceIteration", () => {
        it("increments iteration by 1", () => {
            const state = makeState({ iteration: 3 });
            advanceIteration(state);
            assert.equal(state.iteration, 4);
        });
        it("updates lastIterationAt to a recent ISO timestamp", () => {
            const before = new Date().toISOString();
            const state = makeState();
            advanceIteration(state);
            const after = new Date().toISOString();
            assert.ok(state.lastIterationAt >= before);
            assert.ok(state.lastIterationAt <= after);
        });
        it("mutates state in place (no return value)", () => {
            const state = makeState({ iteration: 0 });
            const result = advanceIteration(state);
            assert.equal(result, undefined);
            assert.equal(state.iteration, 1);
        });
    });
    describe("recordFailure", () => {
        it("increments consecutiveFailures", () => {
            const state = makeState({ consecutiveFailures: 2 });
            recordFailure(state, "test failed");
            assert.equal(state.consecutiveFailures, 3);
        });
        it("stores lastFailureReason", () => {
            const state = makeState();
            recordFailure(state, "compilation error");
            assert.equal(state.lastFailureReason, "compilation error");
        });
    });
    describe("recordSuccess", () => {
        it("resets consecutiveFailures to 0", () => {
            const state = makeState({ consecutiveFailures: 4 });
            recordSuccess(state);
            assert.equal(state.consecutiveFailures, 0);
        });
        it("sets status to success", () => {
            const state = makeState({ status: "running" });
            recordSuccess(state);
            assert.equal(state.status, "success");
        });
        it("sets active to false", () => {
            const state = makeState({ active: true });
            recordSuccess(state);
            assert.equal(state.active, false);
        });
    });
    describe("recordApproach", () => {
        it("appends approach to list", () => {
            const state = makeState();
            recordApproach(state, "tried approach A");
            assert.deepEqual(state.approaches, ["tried approach A"]);
        });
        it("keeps up to 10 approaches (trims oldest)", () => {
            const state = makeState();
            for (let i = 1; i <= 12; i++) {
                recordApproach(state, `approach ${i}`);
            }
            assert.equal(state.approaches.length, 10);
            // oldest ones trimmed — should start at approach 3
            assert.equal(state.approaches[0], "approach 3");
            assert.equal(state.approaches[9], "approach 12");
        });
        it("does not trim when exactly 10 approaches", () => {
            const state = makeState();
            for (let i = 1; i <= 10; i++) {
                recordApproach(state, `approach ${i}`);
            }
            assert.equal(state.approaches.length, 10);
        });
    });
    describe("isExhausted", () => {
        it("returns false when iteration < maxIterations", () => {
            const state = makeState({ iteration: 5, maxIterations: 20 });
            assert.equal(isExhausted(state), false);
        });
        it("returns true when iteration >= maxIterations", () => {
            const state = makeState({ iteration: 20, maxIterations: 20 });
            assert.equal(isExhausted(state), true);
        });
        it("returns true when iteration exceeds maxIterations", () => {
            const state = makeState({ iteration: 25, maxIterations: 20 });
            assert.equal(isExhausted(state), true);
        });
    });
    describe("getAdaptationStrategy", () => {
        it("escalation tier (failures >= 5) overrides iteration count", () => {
            const state = makeState({ iteration: 1, consecutiveFailures: 5 });
            const strategy = getAdaptationStrategy(state);
            assert.ok(strategy.includes("ESCALATION"), "should show escalation for 5 consecutive failures");
        });
        it("straightforward tier for iteration <= 3", () => {
            const state = makeState({ iteration: 1, consecutiveFailures: 0 });
            const strategy = getAdaptationStrategy(state);
            assert.ok(strategy.includes("straightforward"), "should say straightforward for iter 1");
        });
        it("straightforward tier boundary at iteration 3", () => {
            const state = makeState({ iteration: 3, consecutiveFailures: 0 });
            const strategy = getAdaptationStrategy(state);
            assert.ok(strategy.includes("straightforward"), "iter 3 is still straightforward");
        });
        it("reassess tier for iteration 4 to 7", () => {
            const state = makeState({ iteration: 4, consecutiveFailures: 0 });
            const strategy = getAdaptationStrategy(state);
            assert.ok(strategy.includes("reassess"), "iter 4 should say reassess");
        });
        it("reassess tier boundary at iteration 7", () => {
            const state = makeState({ iteration: 7, consecutiveFailures: 0 });
            const strategy = getAdaptationStrategy(state);
            assert.ok(strategy.includes("reassess"), "iter 7 is still reassess");
        });
        it("lateral thinking tier for iteration 8 to 12", () => {
            const state = makeState({ iteration: 8, consecutiveFailures: 0 });
            const strategy = getAdaptationStrategy(state);
            assert.ok(strategy.includes("lateral thinking"), "iter 8 should say lateral thinking");
        });
        it("minimum viable tier for iteration > 12", () => {
            const state = makeState({ iteration: 13, consecutiveFailures: 0 });
            const strategy = getAdaptationStrategy(state);
            assert.ok(strategy.includes("minimum viable"), "iter 13 should say minimum viable");
        });
        it("includes lastFailureReason when set in straightforward tier", () => {
            const state = makeState({ iteration: 2, consecutiveFailures: 0, lastFailureReason: "type error" });
            const strategy = getAdaptationStrategy(state);
            assert.ok(strategy.includes("type error"), "should include lastFailureReason");
        });
        it("includes previous approaches in escalation message", () => {
            const state = makeState({
                iteration: 5,
                consecutiveFailures: 5,
                approaches: ["approach A", "approach B", "approach C"],
            });
            const strategy = getAdaptationStrategy(state);
            assert.ok(strategy.includes("approach A") || strategy.includes("approach B") || strategy.includes("approach C"));
        });
    });
});
