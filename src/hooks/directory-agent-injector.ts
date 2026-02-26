// directory-agent-injector.ts — Auto-recommend agents based on project directory structure
// Event: SessionStart (startup|resume)

import { readStdin, writeOutput } from "../lib/io.js";
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import type { SessionStartInput } from "../lib/types.js";

interface AgentRecommendation {
  agent: string;
  reason: string;
}

function hasTsxOrJsxFiles(dirPath: string): boolean {
  try {
    const entries = readdirSync(dirPath);
    return entries.some((e) => e.endsWith(".tsx") || e.endsWith(".jsx"));
  } catch {
    return false;
  }
}

function checkFrontendDir(cwd: string, dirName: string): boolean {
  const full = join(cwd, dirName);
  if (!existsSync(full)) return false;
  return hasTsxOrJsxFiles(full);
}

function getTopLevelEntries(cwd: string): string[] {
  try {
    return readdirSync(cwd);
  } catch {
    return [];
  }
}

function getRecentGitFiles(cwd: string): string[] {
  try {
    const out = execSync("git diff --name-only HEAD~1 HEAD 2>/dev/null || git diff --name-only HEAD", {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    return out ? out.split("\n").filter(Boolean) : [];
  } catch {
    return [];
  }
}

function recommendAgents(cwd: string): AgentRecommendation[] {
  const recommendations: AgentRecommendation[] = [];
  const added = new Set<string>();

  const entries = getTopLevelEntries(cwd);
  const entrySet = new Set(entries);

  function addIfNew(agent: string, reason: string) {
    if (!added.has(agent)) {
      added.add(agent);
      recommendations.push({ agent, reason });
    }
  }

  // Frontend / UI: designer
  const frontendDirs = ["src/components", "components", "ui", "frontend", "app"];
  for (const dir of frontendDirs) {
    const topLevel = dir.includes("/") ? dir.split("/")[0] : dir;
    if (entrySet.has(topLevel)) {
      if (dir.includes("/")) {
        if (checkFrontendDir(cwd, dir)) {
          addIfNew("designer", `${dir}/ detected`);
          break;
        }
      } else {
        if (checkFrontendDir(cwd, dir)) {
          addIfNew("designer", `${dir}/ detected`);
          break;
        }
      }
    }
  }

  // API / Backend: security-reviewer
  const apiDirs = ["src/api", "api", "routes", "controllers", "server"];
  for (const dir of apiDirs) {
    const topLevel = dir.includes("/") ? dir.split("/")[0] : dir;
    if (dir.includes("/")) {
      if (entrySet.has("src") && existsSync(join(cwd, dir))) {
        addIfNew("security-reviewer", `${dir}/ detected`);
        break;
      }
    } else if (entrySet.has(topLevel)) {
      addIfNew("security-reviewer", `${dir}/ detected`);
      break;
    }
  }

  // Tests: test-engineer
  const testDirs = ["tests", "test", "__tests__", "spec"];
  for (const dir of testDirs) {
    if (entrySet.has(dir)) {
      addIfNew("test-engineer", `${dir}/ detected`);
      break;
    }
  }

  // CI/CD: build-fixer
  const ciDirs = [".github", "ci", ".circleci"];
  for (const dir of ciDirs) {
    if (entrySet.has(dir)) {
      addIfNew("build-fixer", `${dir}/ detected`);
      break;
    }
  }

  // Documentation: librarian
  const docDirs = ["docs", "documentation"];
  for (const dir of docDirs) {
    if (entrySet.has(dir)) {
      addIfNew("librarian", `${dir}/ detected`);
      break;
    }
  }

  // Infrastructure: security-reviewer
  const infraDirs = ["infra", "terraform", "k8s", "deploy"];
  for (const dir of infraDirs) {
    if (entrySet.has(dir)) {
      addIfNew("security-reviewer", `${dir}/ detected`);
      break;
    }
  }

  // Docker: build-fixer
  if (entrySet.has("Dockerfile") || entrySet.has("docker-compose.yml")) {
    const which = entrySet.has("Dockerfile") ? "Dockerfile" : "docker-compose.yml";
    addIfNew("build-fixer", `${which} detected`);
  }

  // Active test files in recent git changes: test-engineer
  const recentFiles = getRecentGitFiles(cwd);
  const hasRecentTests = recentFiles.some(
    (f) => f.endsWith(".test.ts") || f.endsWith(".spec.ts")
  );
  if (hasRecentTests) {
    addIfNew("test-engineer", "active test development in recent git changes");
  }

  return recommendations;
}

async function main() {
  const input = await readStdin<SessionStartInput>();
  const cwd = input.cwd;

  if (!cwd || !existsSync(cwd)) process.exit(0);

  const recommendations = recommendAgents(cwd);
  if (recommendations.length === 0) process.exit(0);

  const parts = recommendations.map(({ agent, reason }) => `${agent} (${reason})`);
  const message = `Recommended agents for this project: ${parts.join(", ")}`;

  writeOutput({
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: message,
    },
  });
}

main();
