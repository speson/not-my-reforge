// Format project memory as context string for injection
export function formatProjectMemory(memory) {
    const sections = [];
    if (memory.techStack.length > 0) {
        sections.push(`Tech Stack: ${memory.techStack.join(", ")}`);
    }
    const cmds = memory.buildCommands;
    const cmdEntries = Object.entries(cmds).filter(([, v]) => v);
    if (cmdEntries.length > 0) {
        const cmdLines = cmdEntries.map(([k, v]) => `  ${k}: ${v}`).join("\n");
        sections.push(`Build Commands:\n${cmdLines}`);
    }
    if (memory.conventions.length > 0) {
        const convLines = memory.conventions
            .map((c) => `  [${c.type}] ${c.pattern}${c.example ? ` (e.g., ${c.example})` : ""}`)
            .join("\n");
        sections.push(`Conventions:\n${convLines}`);
    }
    if (memory.hotPaths.length > 0) {
        sections.push(`Frequently Accessed: ${memory.hotPaths.slice(0, 10).join(", ")}`);
    }
    if (sections.length === 0)
        return "";
    return `[Project Memory]\n${sections.join("\n")}`;
}
