// additionalContext / systemMessage formatting utilities

export function formatContext(sections: string[]): string {
  return sections.filter(Boolean).join("\n");
}

export function escapeForJson(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}
