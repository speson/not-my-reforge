// project-memory-posttool.ts — Learn from tool usage patterns
// Event: PostToolUse (Bash|Read|Edit|Write|Glob|Grep)
import { readStdin } from "../lib/io.js";
import { loadProjectMemory, saveProjectMemory } from "../lib/project-memory/storage.js";
const BUILD_PATTERNS = [
    [/\bnpm\s+(run\s+)?test\b/, "test", "npm test"],
    [/\bnpx\s+jest\b/, "test", "npx jest"],
    [/\bnpx\s+vitest\b/, "test", "npx vitest"],
    [/\bnpm\s+run\s+build\b/, "build", "npm run build"],
    [/\bnpm\s+run\s+dev\b/, "dev", "npm run dev"],
    [/\bnpm\s+run\s+lint\b/, "lint", "npm run lint"],
    [/\bnpx\s+eslint\b/, "lint", "npx eslint"],
    [/\bcargo\s+test\b/, "test", "cargo test"],
    [/\bcargo\s+build\b/, "build", "cargo build"],
    [/\bcargo\s+clippy\b/, "lint", "cargo clippy"],
    [/\bgo\s+test\b/, "test", "go test ./..."],
    [/\bgo\s+build\b/, "build", "go build ./..."],
    [/\bpytest\b/, "test", "pytest"],
    [/\bruff\s+check\b/, "lint", "ruff check ."],
    [/\bmake\s+test\b/, "test", "make test"],
    [/\bmake\s+build\b/, "build", "make build"],
];
async function main() {
    const input = await readStdin();
    const cwd = input.cwd;
    if (!cwd)
        process.exit(0);
    let updated = false;
    const memory = loadProjectMemory(cwd);
    // Learn build commands from Bash usage
    if (input.tool_name === "Bash") {
        const command = input.tool_input?.command;
        if (command) {
            for (const [regex, key, cmd] of BUILD_PATTERNS) {
                if (regex.test(command) && !memory.buildCommands[key]) {
                    memory.buildCommands[key] = cmd;
                    updated = true;
                }
            }
        }
    }
    // Track hot paths from file access
    if (["Read", "Edit", "Write", "Glob", "Grep"].includes(input.tool_name)) {
        const filePath = input.tool_input?.file_path;
        const path = input.tool_input?.path;
        const target = filePath || path;
        if (target && typeof target === "string") {
            // Extract relative directory
            const relPath = target.startsWith(cwd) ? target.slice(cwd.length + 1) : target;
            const dir = relPath.split("/").slice(0, 2).join("/");
            if (dir && !dir.startsWith(".") && !memory.hotPaths.includes(dir)) {
                memory.hotPaths.push(dir);
                // Keep only top 20
                if (memory.hotPaths.length > 20) {
                    memory.hotPaths = memory.hotPaths.slice(-20);
                }
                updated = true;
            }
        }
    }
    if (updated) {
        saveProjectMemory(cwd, memory);
    }
}
main();
