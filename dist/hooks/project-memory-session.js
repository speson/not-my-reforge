// project-memory-session.ts — Load/create project memory at session start
// Event: SessionStart
import { readStdin, writeOutput } from "../lib/io.js";
import { detectProject } from "../lib/project-memory/detector.js";
import { loadProjectMemory, saveProjectMemory, mergeMemory } from "../lib/project-memory/storage.js";
import { formatProjectMemory } from "../lib/project-memory/formatter.js";
import { formatLearnedContext } from "../lib/learner/query.js";
import { dataFileExists } from "../lib/storage.js";
async function main() {
    const input = await readStdin();
    const cwd = input.cwd;
    if (!cwd)
        process.exit(0);
    const detected = detectProject(cwd);
    let memory;
    if (dataFileExists(cwd, "project-memory.json")) {
        const existing = loadProjectMemory(cwd);
        memory = mergeMemory(existing, detected);
    }
    else {
        memory = detected;
    }
    saveProjectMemory(cwd, memory);
    const sections = [];
    const memoryContext = formatProjectMemory(memory);
    if (memoryContext)
        sections.push(memoryContext);
    // Inject learned patterns from previous sessions
    const learnedContext = formatLearnedContext(cwd);
    if (learnedContext)
        sections.push(learnedContext);
    if (sections.length > 0) {
        writeOutput({
            hookSpecificOutput: {
                hookEventName: "SessionStart",
                additionalContext: sections.join("\n\n"),
            },
        });
    }
}
main();
