// additionalContext / systemMessage formatting utilities
export function formatContext(sections) {
    return sections.filter(Boolean).join("\n");
}
export function escapeForJson(text) {
    return text.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}
