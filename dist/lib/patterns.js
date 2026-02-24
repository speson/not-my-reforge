// Slop pattern matching — programmatic port of slop-patterns.txt
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
let cachedPatterns = null;
function loadPatterns(pluginRoot) {
    if (cachedPatterns)
        return cachedPatterns;
    const patternsFile = join(pluginRoot, "scripts", "slop-patterns.txt");
    if (!existsSync(patternsFile)) {
        cachedPatterns = [];
        return cachedPatterns;
    }
    const lines = readFileSync(patternsFile, "utf-8").split("\n");
    cachedPatterns = [];
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#"))
            continue;
        try {
            cachedPatterns.push(new RegExp(trimmed, "i"));
        }
        catch {
            // Skip invalid regex patterns
        }
    }
    return cachedPatterns;
}
const COMMENT_REGEX = {
    js: /^\s*(\/\/|\/\*|\*)/,
    ts: /^\s*(\/\/|\/\*|\*)/,
    jsx: /^\s*(\/\/|\/\*|\*)/,
    tsx: /^\s*(\/\/|\/\*|\*)/,
    java: /^\s*(\/\/|\/\*|\*)/,
    go: /^\s*(\/\/|\/\*|\*)/,
    rs: /^\s*(\/\/|\/\*|\*)/,
    c: /^\s*(\/\/|\/\*|\*)/,
    cpp: /^\s*(\/\/|\/\*|\*)/,
    h: /^\s*(\/\/|\/\*|\*)/,
    swift: /^\s*(\/\/|\/\*|\*)/,
    kt: /^\s*(\/\/|\/\*|\*)/,
    py: /^\s*#/,
    rb: /^\s*#/,
    sh: /^\s*#/,
    bash: /^\s*#/,
    yaml: /^\s*#/,
    yml: /^\s*#/,
    toml: /^\s*#/,
    html: /^\s*<!--/,
    xml: /^\s*<!--/,
    svelte: /^\s*<!--/,
    vue: /^\s*<!--/,
    css: /^\s*\/\*/,
    scss: /^\s*\/\*/,
    less: /^\s*\/\*/,
};
const FALLBACK_COMMENT_REGEX = /^\s*(\/\/|#|\/\*|\*|<!--)/;
function getCommentRegex(ext) {
    return COMMENT_REGEX[ext] || FALLBACK_COMMENT_REGEX;
}
export function findSlopComments(fileContent, filePath, pluginRoot) {
    const patterns = loadPatterns(pluginRoot);
    if (patterns.length === 0)
        return [];
    const ext = filePath.split(".").pop()?.toLowerCase() || "";
    const commentRegex = getCommentRegex(ext);
    const lines = fileContent.split("\n");
    const matches = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!commentRegex.test(line))
            continue;
        for (const pattern of patterns) {
            if (pattern.test(line)) {
                matches.push({
                    pattern: pattern.source,
                    line: line.trim(),
                    lineNumber: i + 1,
                });
                break; // One match per line is enough
            }
        }
    }
    return matches;
}
