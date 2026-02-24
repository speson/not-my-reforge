// Notepad persistence in .reforge/notepad.md
// Stored as markdown for human readability
import { readDataText, writeDataFile } from "../storage.js";
import { createEmptyNotepad } from "./types.js";
import { randomBytes } from "node:crypto";
const FILENAME = "notepad.md";
function parseNotepadMd(content) {
    if (!content.trim())
        return createEmptyNotepad();
    const entries = [];
    const blocks = content.split(/^---$/m).filter(Boolean);
    for (const block of blocks) {
        const lines = block.trim().split("\n");
        if (lines.length < 2)
            continue;
        // Parse header: ## [priority] category: id
        const headerMatch = lines[0].match(/^##\s+\[(\w+)\]\s+(\w+):\s+(.+)$/);
        if (!headerMatch)
            continue;
        const [, priority, category, id] = headerMatch;
        const createdLine = lines.find((l) => l.startsWith("_Created:"));
        const createdAt = createdLine?.match(/_Created:\s+(.+)_/)?.[1] || new Date().toISOString();
        const contentLines = lines
            .slice(1)
            .filter((l) => !l.startsWith("_Created:"))
            .join("\n")
            .trim();
        entries.push({
            id,
            content: contentLines,
            priority: priority,
            category: category,
            createdAt,
        });
    }
    return { entries };
}
function formatNotepadMd(notepad) {
    if (notepad.entries.length === 0)
        return "";
    return notepad.entries
        .map((e) => `## [${e.priority}] ${e.category}: ${e.id}\n${e.content}\n_Created: ${e.createdAt}_\n---`)
        .join("\n");
}
export function loadNotepad(cwd) {
    const content = readDataText(cwd, FILENAME);
    return parseNotepadMd(content);
}
export function saveNotepad(cwd, notepad) {
    writeDataFile(cwd, FILENAME, formatNotepadMd(notepad));
}
export function addNote(cwd, content, priority = "normal", category = "other") {
    const notepad = loadNotepad(cwd);
    const entry = {
        id: randomBytes(4).toString("hex"),
        content,
        priority,
        category,
        createdAt: new Date().toISOString(),
    };
    notepad.entries.push(entry);
    saveNotepad(cwd, notepad);
    return entry;
}
export function getCriticalNotes(cwd) {
    const notepad = loadNotepad(cwd);
    return notepad.entries.filter((e) => e.priority === "critical");
}
