// Auto-detect project tech stack, build commands, and conventions

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ProjectMemory, BuildCommands } from "./types.js";
import { createDefaultMemory } from "./types.js";

interface PackageJson {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

function readJson<T>(path: string): T | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as T;
  } catch {
    return null;
  }
}

function detectTechStack(cwd: string): string[] {
  const stack: string[] = [];
  const checks: [string, string][] = [
    ["package.json", "Node.js"],
    ["tsconfig.json", "TypeScript"],
    ["Cargo.toml", "Rust"],
    ["go.mod", "Go"],
    ["pyproject.toml", "Python"],
    ["setup.py", "Python"],
    ["requirements.txt", "Python"],
    ["Gemfile", "Ruby"],
    ["pom.xml", "Java"],
    ["build.gradle", "Java"],
    ["build.gradle.kts", "Kotlin"],
    ["pubspec.yaml", "Flutter"],
    ["composer.json", "PHP"],
    [".swift-version", "Swift"],
    ["CMakeLists.txt", "C/C++"],
  ];

  for (const [file, tech] of checks) {
    if (existsSync(join(cwd, file)) && !stack.includes(tech)) {
      stack.push(tech);
    }
  }

  // Detect frameworks from package.json
  const pkg = readJson<PackageJson>(join(cwd, "package.json"));
  if (pkg) {
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    const frameworks: [string, string][] = [
      ["react", "React"],
      ["next", "Next.js"],
      ["vue", "Vue"],
      ["nuxt", "Nuxt"],
      ["svelte", "Svelte"],
      ["@sveltejs/kit", "SvelteKit"],
      ["angular", "Angular"],
      ["express", "Express"],
      ["fastify", "Fastify"],
      ["nest", "NestJS"],
      ["@nestjs/core", "NestJS"],
      ["hono", "Hono"],
    ];
    for (const [dep, name] of frameworks) {
      if (allDeps[dep] && !stack.includes(name)) {
        stack.push(name);
      }
    }
  }

  return stack;
}

function detectBuildCommands(cwd: string): BuildCommands {
  const commands: BuildCommands = {};

  // Node.js projects
  const pkg = readJson<PackageJson>(join(cwd, "package.json"));
  if (pkg?.scripts) {
    const s = pkg.scripts;
    if (s.dev) commands.dev = `npm run dev`;
    if (s.start) commands.dev ??= `npm start`;
    if (s.build) commands.build = `npm run build`;
    if (s.test) commands.test = `npm test`;
    if (s.lint) commands.lint = `npm run lint`;
    if (s.format) commands.format = `npm run format`;
    if (s.typecheck) commands.lint = `npm run typecheck`;
  }

  // Cargo projects
  if (existsSync(join(cwd, "Cargo.toml"))) {
    commands.build ??= "cargo build";
    commands.test ??= "cargo test";
    commands.lint ??= "cargo clippy";
  }

  // Go projects
  if (existsSync(join(cwd, "go.mod"))) {
    commands.build ??= "go build ./...";
    commands.test ??= "go test ./...";
    commands.lint ??= "golangci-lint run";
  }

  // Python projects
  if (existsSync(join(cwd, "pyproject.toml"))) {
    commands.test ??= "pytest";
    commands.lint ??= "ruff check .";
  }

  // Makefile
  if (existsSync(join(cwd, "Makefile"))) {
    commands.build ??= "make";
    commands.test ??= "make test";
  }

  return commands;
}

export function detectProject(cwd: string): ProjectMemory {
  const memory = createDefaultMemory();
  memory.techStack = detectTechStack(cwd);
  memory.buildCommands = detectBuildCommands(cwd);
  memory.lastUpdated = new Date().toISOString();
  return memory;
}
