export interface NotepadEntry {
  id: string;
  content: string;
  priority: "critical" | "normal";
  category: "task" | "context" | "decision" | "warning" | "other";
  createdAt: string;
}

export interface Notepad {
  entries: NotepadEntry[];
}

export function createEmptyNotepad(): Notepad {
  return { entries: [] };
}
