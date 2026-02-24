// Query learned patterns for context injection
import { loadPatterns } from "./pattern-extractor.js";
export function getHighConfidencePatterns(cwd, minConfidence = 0.3) {
    const data = loadPatterns(cwd);
    return data.patterns
        .filter((p) => p.confidence >= minConfidence)
        .sort((a, b) => b.confidence - a.confidence);
}
export function getPatternsByType(cwd, type, minConfidence = 0.2) {
    const data = loadPatterns(cwd);
    return data.patterns
        .filter((p) => p.type === type && p.confidence >= minConfidence)
        .sort((a, b) => b.confidence - a.confidence);
}
export function getDominantPattern(cwd, type) {
    const patterns = getPatternsByType(cwd, type);
    return patterns.length > 0 ? patterns[0] : null;
}
export function formatLearnedContext(cwd) {
    const highConf = getHighConfidencePatterns(cwd, 0.4);
    if (highConf.length === 0)
        return null;
    const grouped = {};
    for (const p of highConf) {
        if (!grouped[p.type])
            grouped[p.type] = [];
        grouped[p.type].push(p);
    }
    const lines = ["[Learned Project Conventions]"];
    if (grouped.naming) {
        const dominant = grouped.naming[0];
        lines.push(`Naming: ${dominant.pattern} (${Math.round(dominant.confidence * 100)}% confidence, ${dominant.observedCount} observations)`);
    }
    if (grouped.import) {
        const dominant = grouped.import[0];
        lines.push(`Imports: ${dominant.pattern} (${Math.round(dominant.confidence * 100)}% confidence)`);
    }
    if (grouped.command) {
        const cmds = grouped.command.slice(0, 3).map((p) => p.pattern);
        lines.push(`Build commands: ${cmds.join(", ")}`);
    }
    if (grouped.workflow) {
        const flows = grouped.workflow.slice(0, 3).map((p) => p.pattern);
        lines.push(`Workflows: ${flows.join(", ")}`);
    }
    if (grouped.structure) {
        const structs = grouped.structure.slice(0, 3).map((p) => p.pattern);
        lines.push(`Structure: ${structs.join(", ")}`);
    }
    return lines.length > 1 ? lines.join("\n") : null;
}
