// Tests for src/lib/failure-playbook/strategies.ts
// Run: npx tsx --test src/lib/__tests__/failure-playbook.test.ts

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { getRecoveryStrategy } from "../failure-playbook/strategies.js";

describe("failure playbook — TypeScript errors", () => {
  it("matches error TS code pattern", () => {
    const result = getRecoveryStrategy("Bash", "error TS2345: Argument of type");
    assert.notEqual(result, null);
    assert.equal(result!.errorType, "TypeScript error");
    assert.ok(result!.suggestion.length > 0);
    assert.ok(result!.commands.length > 0);
  });

  it("matches 'Cannot find' pattern", () => {
    const result = getRecoveryStrategy("Bash", "Cannot find module './foo'");
    assert.notEqual(result, null);
    assert.equal(result!.errorType, "TypeScript error");
  });

  it("matches Type assignable pattern", () => {
    const result = getRecoveryStrategy("Bash", "Type 'string' is not assignable to type 'number'");
    assert.notEqual(result, null);
    assert.equal(result!.errorType, "TypeScript error");
  });
});

describe("failure playbook — Test failures", () => {
  it("matches FAIL keyword", () => {
    const result = getRecoveryStrategy("Bash", "FAIL src/lib/__tests__/foo.test.ts");
    assert.notEqual(result, null);
    assert.equal(result!.errorType, "Test failure");
  });

  it("matches AssertionError", () => {
    const result = getRecoveryStrategy("Bash", "AssertionError: expected 1 to equal 2");
    assert.notEqual(result, null);
    assert.equal(result!.errorType, "Test failure");
  });

  it("matches Expected/Received pattern", () => {
    const result = getRecoveryStrategy("Bash", "Expected 'hello' Received 'world'");
    assert.notEqual(result, null);
    assert.equal(result!.errorType, "Test failure");
  });

  it("matches 'test failed' case insensitive", () => {
    const result = getRecoveryStrategy("Bash", "Test Failed: some spec");
    assert.notEqual(result, null);
    assert.equal(result!.errorType, "Test failure");
  });

  it("does not match 'fail' in lowercase (word boundary)", () => {
    // 'fail' without word boundary should not match \bFAIL\b
    const result = getRecoveryStrategy("Bash", "This will fail soon");
    // \bFAIL\b requires uppercase FAIL
    assert.equal(result, null);
  });
});

describe("failure playbook — Build errors", () => {
  it("matches Module not found", () => {
    const result = getRecoveryStrategy("Bash", "Module not found: Error: Can't resolve 'lodash'");
    assert.notEqual(result, null);
    assert.equal(result!.errorType, "Build error");
  });

  it("matches Cannot resolve", () => {
    const result = getRecoveryStrategy("Bash", "Cannot resolve dependency './utils'");
    assert.notEqual(result, null);
    assert.equal(result!.errorType, "Build error");
  });

  it("matches compilation failed case insensitive", () => {
    const result = getRecoveryStrategy("Bash", "Compilation Failed with 3 errors");
    assert.notEqual(result, null);
    assert.equal(result!.errorType, "Build error");
  });
});

describe("failure playbook — Permission errors", () => {
  it("matches EACCES", () => {
    const result = getRecoveryStrategy("Bash", "Error: EACCES: permission denied");
    assert.notEqual(result, null);
    assert.equal(result!.errorType, "Permission error");
  });

  it("matches Permission denied", () => {
    const result = getRecoveryStrategy("Bash", "bash: /usr/bin/foo: Permission denied");
    assert.notEqual(result, null);
    assert.equal(result!.errorType, "Permission error");
  });
});

describe("failure playbook — Syntax errors", () => {
  it("matches SyntaxError", () => {
    const result = getRecoveryStrategy("Bash", "SyntaxError: Unexpected end of input");
    assert.notEqual(result, null);
    assert.equal(result!.errorType, "Syntax error");
  });

  it("matches Unexpected token", () => {
    const result = getRecoveryStrategy("Bash", "Unexpected token '}'");
    assert.notEqual(result, null);
    assert.equal(result!.errorType, "Syntax error");
  });
});

describe("failure playbook — no match", () => {
  it("returns null for unrecognized error", () => {
    const result = getRecoveryStrategy("Bash", "Everything is fine, no errors here");
    assert.equal(result, null);
  });

  it("returns null for empty string", () => {
    const result = getRecoveryStrategy("Bash", "");
    assert.equal(result, null);
  });
});

describe("failure playbook — result shape", () => {
  it("has errorType, suggestion, and commands array", () => {
    const result = getRecoveryStrategy("Bash", "error TS1234: foo");
    assert.notEqual(result, null);
    assert.equal(typeof result!.errorType, "string");
    assert.equal(typeof result!.suggestion, "string");
    assert.ok(Array.isArray(result!.commands));
    assert.ok(result!.commands.length >= 1);
  });

  it("commands are non-empty strings", () => {
    const result = getRecoveryStrategy("Bash", "SyntaxError: oops");
    assert.notEqual(result, null);
    for (const cmd of result!.commands) {
      assert.equal(typeof cmd, "string");
      assert.ok(cmd.length > 0);
    }
  });
});

describe("failure playbook — first match wins", () => {
  it("TypeScript error wins over Build error for 'Cannot find'", () => {
    // "Cannot find" matches TypeScript pattern first
    const result = getRecoveryStrategy("Bash", "Cannot find module 'react'");
    assert.notEqual(result, null);
    assert.equal(result!.errorType, "TypeScript error");
  });
});

describe("failure playbook — toolName parameter", () => {
  it("works with any tool name (toolName is unused)", () => {
    const result1 = getRecoveryStrategy("Bash", "error TS2345");
    const result2 = getRecoveryStrategy("Write", "error TS2345");
    const result3 = getRecoveryStrategy("Edit", "error TS2345");
    assert.deepEqual(result1, result2);
    assert.deepEqual(result2, result3);
  });
});
