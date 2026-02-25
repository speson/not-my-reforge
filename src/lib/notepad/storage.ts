// Notepad persistence in .reforge/notepad.md
// Stored as markdown for human readability

import { readDataText, writeDataFile } from "../storage.js";
import type { Notepad, NotepadEntry } from "./types.js";
import { createEmptyNotepad } from "./types.js";
import { randomBytes } from "node:crypto";

const FILENAME = "notepad.md";

function parseNotepadMd(content: string): Notepad {
  if (!content.trim()) return createEmptyNotepad();

  const entries: NotepadEntry[] = [];
  const blocks = content.split(/^---$/m).filter(Boolean);

  for (const block of blocks) {
    const lines = block.trim().split("\n");
    if (lines.length < 2) continue;

    // Parse header: ## [priority] category: id
    const headerMatch = lines[0].match(/^##\s+\[(\w+)\]\s+(\w+):\s+(.+)$/);
    if (!headerMatch) continue;

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
      priority: priority as "critical" | "normal",
      category: category as NotepadEntry["category"],
      createdAt,
    });
  }

  return { entries };
}

function formatNotepadMd(notepad: Notepad): string {
  if (notepad.entries.length === 0) return "";

  return notepad.entries
    .map(
      (e) =>
        `## [${e.priority}] ${e.category}: ${e.id}\n${e.content}\n_Created: ${e.createdAt}_\n---`
    )
    .join("\n");
}

export function loadNotepad(cwd: string): Notepad {
  const content = readDataText(cwd, FILENAME);
  return parseNotepadMd(content);
}

export function saveNotepad(cwd: string, notepad: Notepad): void {
  writeDataFile(cwd, FILENAME, formatNotepadMd(notepad));
}

export function addNote(
  cwd: string,
  content: string,
  priority: NotepadEntry["priority"] = "normal",
  category: NotepadEntry["category"] = "other"
): NotepadEntry {
  const notepad = loadNotepad(cwd);
  const entry: NotepadEntry = {
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

export function getCriticalNotes(cwd: string): NotepadEntry[] {
  const notepad = loadNotepad(cwd);
  return notepad.entries.filter((e) => e.priority === "critical");
}
