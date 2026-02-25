// Extract conventions from code patterns
import { readDataFile, writeDataFile } from "../storage.js";
import { createEmptyPatterns } from "./types.js";
const FILENAME = "learned-patterns.json";
const MAX_PATTERNS = 50;
export function loadPatterns(cwd) {
    return readDataFile(cwd, FILENAME, createEmptyPatterns());
}
export function savePatterns(cwd, patterns) {
    patterns.lastUpdated = new Date().toISOString();
    writeDataFile(cwd, FILENAME, patterns);
}
export function observePattern(cwd, type, pattern, example) {
    const data = loadPatterns(cwd);
    const existing = data.patterns.find((p) => p.type === type && p.pattern === pattern);
    if (existing) {
        existing.observedCount += 1;
        existing.confidence = Math.min(1, existing.observedCount / 10);
        existing.lastSeen = new Date().toISOString();
        if (!existing.examples.includes(example) && existing.examples.length < 5) {
            existing.examples.push(example);
        }
    }
    else {
        data.patterns.push({
            type,
            pattern,
            confidence: 0.1,
            examples: [example],
            observedCount: 1,
            lastSeen: new Date().toISOString(),
        });
    }
    // Evict low-confidence patterns if over limit
    if (data.patterns.length > MAX_PATTERNS) {
        data.patterns.sort((a, b) => b.confidence - a.confidence);
        data.patterns = data.patterns.slice(0, MAX_PATTERNS);
    }
    savePatterns(cwd, data);
}
export function detectNamingConvention(filePath) {
    const name = filePath.split("/").pop()?.replace(/\.\w+$/, "") || "";
    if (!name)
        return null;
    if (name.includes("-"))
        return "kebab-case";
    if (name.includes("_"))
        return "snake_case";
    if (name[0] === name[0].toUpperCase() && name.length > 1)
        return "PascalCase";
    if (/[a-z][A-Z]/.test(name))
        return "camelCase";
    return null;
}
export function detectImportStyle(content) {
    if (/^import .+ from ['"]/.test(content))
        return "esm-default";
    if (/^import \{/.test(content))
        return "esm-named";
    if (/^const .+ = require\(/.test(content))
        return "commonjs";
    return null;
}
