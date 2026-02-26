// Tests for src/lib/trust/tracker.ts
// Run: npx tsx --test src/lib/__tests__/trust-tracker.test.ts

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  loadTrustState,
  recordSuccess,
  recordFailure,
  recordBuildPass,
  recordTestPass,
  getTrustLevel,
  formatTrustStatus,
} from "../trust/tracker.js";

function makeTmpDir(): string {
  return mkdtempSync(join(tmpdir(), "reforge-trust-test-"));
}

describe("trust tracker — loadTrustState", () => {
  it("returns default state when no file exists", () => {
    const cwd = makeTmpDir();
    try {
      const state = loadTrustState(cwd);
      assert.equal(state.level, 0);
      assert.equal(state.consecutiveSuccesses, 0);
      assert.equal(state.buildPassed, false);
      assert.equal(state.testsPassed, false);
      assert.equal(state.sessionId, "");
    } finally {
      rmSync(cwd, { recursive: true });
    }
  });

  it("persists state across loads", () => {
    const cwd = makeTmpDir();
    try {
      recordSuccess(cwd, "Edit");
      const state = loadTrustState(cwd);
      assert.equal(state.consecutiveSuccesses, 1);
    } finally {
      rmSync(cwd, { recursive: true });
    }
  });
});

describe("trust tracker — recordSuccess", () => {
  it("increments consecutiveSuccesses for Edit", () => {
    const cwd = makeTmpDir();
    try {
      const state = recordSuccess(cwd, "Edit");
      assert.equal(state.consecutiveSuccesses, 1);
    } finally {
      rmSync(cwd, { recursive: true });
    }
  });

  it("increments consecutiveSuccesses for Write", () => {
    const cwd = makeTmpDir();
    try {
      const state = recordSuccess(cwd, "Write");
      assert.equal(state.consecutiveSuccesses, 1);
    } finally {
      rmSync(cwd, { recursive: true });
    }
  });

  it("ignores non-Edit/Write tools", () => {
    const cwd = makeTmpDir();
    try {
      const state = recordSuccess(cwd, "Bash");
      assert.equal(state.consecutiveSuccesses, 0);
    } finally {
      rmSync(cwd, { recursive: true });
    }
  });

  it("ignores Read tool", () => {
    const cwd = makeTmpDir();
    try {
      const state = recordSuccess(cwd, "Read");
      assert.equal(state.consecutiveSuccesses, 0);
    } finally {
      rmSync(cwd, { recursive: true });
    }
  });

  it("promotes level 0 → 1 after 5 consecutive successes", () => {
    const cwd = makeTmpDir();
    try {
      for (let i = 0; i < 4; i++) {
        const s = recordSuccess(cwd, "Edit");
        assert.equal(s.level, 0, `Should still be level 0 at ${i + 1} successes`);
      }
      const state = recordSuccess(cwd, "Write");
      assert.equal(state.level, 1);
      assert.equal(state.consecutiveSuccesses, 5);
    } finally {
      rmSync(cwd, { recursive: true });
    }
  });

  it("does not promote beyond level 1 via recordSuccess", () => {
    const cwd = makeTmpDir();
    try {
      // Get to level 1
      for (let i = 0; i < 5; i++) recordSuccess(cwd, "Edit");
      // 5 more successes should not advance to level 2
      for (let i = 0; i < 5; i++) recordSuccess(cwd, "Edit");
      const state = loadTrustState(cwd);
      assert.equal(state.level, 1);
    } finally {
      rmSync(cwd, { recursive: true });
    }
  });
});

describe("trust tracker — recordFailure", () => {
  it("resets consecutiveSuccesses to 0", () => {
    const cwd = makeTmpDir();
    try {
      recordSuccess(cwd, "Edit");
      recordSuccess(cwd, "Edit");
      const state = recordFailure(cwd);
      assert.equal(state.consecutiveSuccesses, 0);
    } finally {
      rmSync(cwd, { recursive: true });
    }
  });

  it("does not reduce trust level", () => {
    const cwd = makeTmpDir();
    try {
      // Reach level 1
      for (let i = 0; i < 5; i++) recordSuccess(cwd, "Edit");
      assert.equal(getTrustLevel(cwd), 1);
      // Failure should not demote
      recordFailure(cwd);
      assert.equal(getTrustLevel(cwd), 1);
    } finally {
      rmSync(cwd, { recursive: true });
    }
  });

  it("failure then success restarts count from 0", () => {
    const cwd = makeTmpDir();
    try {
      recordSuccess(cwd, "Edit");
      recordSuccess(cwd, "Edit");
      recordSuccess(cwd, "Edit");
      recordFailure(cwd);
      const state = recordSuccess(cwd, "Edit");
      assert.equal(state.consecutiveSuccesses, 1);
    } finally {
      rmSync(cwd, { recursive: true });
    }
  });
});

describe("trust tracker — recordBuildPass", () => {
  it("sets buildPassed to true", () => {
    const cwd = makeTmpDir();
    try {
      const state = recordBuildPass(cwd);
      assert.equal(state.buildPassed, true);
    } finally {
      rmSync(cwd, { recursive: true });
    }
  });

  it("promotes level 1 → 2", () => {
    const cwd = makeTmpDir();
    try {
      for (let i = 0; i < 5; i++) recordSuccess(cwd, "Edit");
      assert.equal(getTrustLevel(cwd), 1);
      recordBuildPass(cwd);
      assert.equal(getTrustLevel(cwd), 2);
    } finally {
      rmSync(cwd, { recursive: true });
    }
  });

  it("does not promote from level 0", () => {
    const cwd = makeTmpDir();
    try {
      recordBuildPass(cwd);
      assert.equal(getTrustLevel(cwd), 0);
    } finally {
      rmSync(cwd, { recursive: true });
    }
  });

  it("does not promote from level 2 to 3", () => {
    const cwd = makeTmpDir();
    try {
      for (let i = 0; i < 5; i++) recordSuccess(cwd, "Edit");
      recordBuildPass(cwd);
      assert.equal(getTrustLevel(cwd), 2);
      // Another build pass should not advance further
      recordBuildPass(cwd);
      assert.equal(getTrustLevel(cwd), 2);
    } finally {
      rmSync(cwd, { recursive: true });
    }
  });
});

describe("trust tracker — recordTestPass", () => {
  it("sets testsPassed to true", () => {
    const cwd = makeTmpDir();
    try {
      const state = recordTestPass(cwd);
      assert.equal(state.testsPassed, true);
    } finally {
      rmSync(cwd, { recursive: true });
    }
  });

  it("promotes level 2 → 3", () => {
    const cwd = makeTmpDir();
    try {
      for (let i = 0; i < 5; i++) recordSuccess(cwd, "Edit");
      recordBuildPass(cwd);
      assert.equal(getTrustLevel(cwd), 2);
      recordTestPass(cwd);
      assert.equal(getTrustLevel(cwd), 3);
    } finally {
      rmSync(cwd, { recursive: true });
    }
  });

  it("does not promote from level 0 or 1", () => {
    const cwd = makeTmpDir();
    try {
      recordTestPass(cwd);
      assert.equal(getTrustLevel(cwd), 0);

      for (let i = 0; i < 5; i++) recordSuccess(cwd, "Edit");
      assert.equal(getTrustLevel(cwd), 1);
      recordTestPass(cwd);
      assert.equal(getTrustLevel(cwd), 1);
    } finally {
      rmSync(cwd, { recursive: true });
    }
  });
});

describe("trust tracker — getTrustLevel", () => {
  it("returns 0 for fresh state", () => {
    const cwd = makeTmpDir();
    try {
      assert.equal(getTrustLevel(cwd), 0);
    } finally {
      rmSync(cwd, { recursive: true });
    }
  });
});

describe("trust tracker — full progression L0 → L3", () => {
  it("progresses through all levels correctly", () => {
    const cwd = makeTmpDir();
    try {
      // L0: strict
      assert.equal(getTrustLevel(cwd), 0);

      // L0 → L1: 5 consecutive Edit/Write successes
      for (let i = 0; i < 5; i++) recordSuccess(cwd, "Edit");
      assert.equal(getTrustLevel(cwd), 1);

      // L1 → L2: build pass
      recordBuildPass(cwd);
      assert.equal(getTrustLevel(cwd), 2);

      // L2 → L3: test pass
      recordTestPass(cwd);
      assert.equal(getTrustLevel(cwd), 3);
    } finally {
      rmSync(cwd, { recursive: true });
    }
  });
});

describe("trust tracker — formatTrustStatus", () => {
  it("shows level 0 with progress info", () => {
    const cwd = makeTmpDir();
    try {
      recordSuccess(cwd, "Edit");
      recordSuccess(cwd, "Edit");
      const output = formatTrustStatus(cwd);
      assert.ok(output.includes("level: 0"));
      assert.ok(output.includes("strict"));
      assert.ok(output.includes("2/5"));
    } finally {
      rmSync(cwd, { recursive: true });
    }
  });

  it("shows level 1 with build info", () => {
    const cwd = makeTmpDir();
    try {
      for (let i = 0; i < 5; i++) recordSuccess(cwd, "Edit");
      const output = formatTrustStatus(cwd);
      assert.ok(output.includes("level: 1"));
      assert.ok(output.includes("familiar"));
      assert.ok(output.includes("build pass"));
    } finally {
      rmSync(cwd, { recursive: true });
    }
  });

  it("shows level 2 with test info", () => {
    const cwd = makeTmpDir();
    try {
      for (let i = 0; i < 5; i++) recordSuccess(cwd, "Edit");
      recordBuildPass(cwd);
      const output = formatTrustStatus(cwd);
      assert.ok(output.includes("level: 2"));
      assert.ok(output.includes("trusted"));
      assert.ok(output.includes("test pass"));
    } finally {
      rmSync(cwd, { recursive: true });
    }
  });

  it("shows level 3 with max reached message", () => {
    const cwd = makeTmpDir();
    try {
      for (let i = 0; i < 5; i++) recordSuccess(cwd, "Edit");
      recordBuildPass(cwd);
      recordTestPass(cwd);
      const output = formatTrustStatus(cwd);
      assert.ok(output.includes("level: 3"));
      assert.ok(output.includes("autonomous"));
      assert.ok(output.includes("Maximum trust level"));
    } finally {
      rmSync(cwd, { recursive: true });
    }
  });

  it("includes CURRENT marker for active level", () => {
    const cwd = makeTmpDir();
    try {
      const output = formatTrustStatus(cwd);
      assert.ok(output.includes("0 (strict)") && output.includes("[CURRENT]"));
    } finally {
      rmSync(cwd, { recursive: true });
    }
  });
});
