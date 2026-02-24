// IntentGate — detect potentially destructive or risky user requests
const DESTRUCTIVE_PATTERNS = [
    // Git destructive operations
    { pattern: /\bgit\s+push\s+--force\b/i, risk: "critical", reason: "Force push can overwrite remote history" },
    { pattern: /\bgit\s+reset\s+--hard\b/i, risk: "critical", reason: "Hard reset discards all uncommitted changes" },
    { pattern: /\bgit\s+clean\s+-f/i, risk: "high", reason: "Git clean removes untracked files permanently" },
    { pattern: /\bgit\s+branch\s+-D\b/i, risk: "medium", reason: "Force-deletes a branch regardless of merge status" },
    { pattern: /\bgit\s+checkout\s+\.\s*$/i, risk: "high", reason: "Discards all unstaged changes" },
    { pattern: /\bgit\s+stash\s+drop\b/i, risk: "medium", reason: "Permanently removes a stash entry" },
    // File system destructive
    { pattern: /\brm\s+-rf?\s/i, risk: "high", reason: "Recursive file deletion" },
    { pattern: /\brmdir\b/i, risk: "medium", reason: "Directory removal" },
    { pattern: /\b(delete|remove|drop)\s+(all|every|entire)\b/i, risk: "high", reason: "Bulk deletion request" },
    { pattern: /\bwipe\b/i, risk: "high", reason: "Data wipe request" },
    { pattern: /\bformat\s+(disk|drive|partition)\b/i, risk: "critical", reason: "Disk format request" },
    // Database destructive
    { pattern: /\bDROP\s+(TABLE|DATABASE|SCHEMA|INDEX)\b/i, risk: "critical", reason: "Database object deletion" },
    { pattern: /\bTRUNCATE\s+TABLE\b/i, risk: "critical", reason: "Table data truncation" },
    { pattern: /\bDELETE\s+FROM\s+\w+\s*(;|\s*$)/i, risk: "high", reason: "DELETE without WHERE clause" },
    // Infrastructure
    { pattern: /\b(destroy|terminate)\s+(server|instance|cluster|infra)/i, risk: "critical", reason: "Infrastructure destruction" },
    { pattern: /\bkubectl\s+delete\b/i, risk: "high", reason: "Kubernetes resource deletion" },
    { pattern: /\bterraform\s+destroy\b/i, risk: "critical", reason: "Infrastructure teardown" },
    // Package/dependency
    { pattern: /\bnpm\s+unpublish\b/i, risk: "critical", reason: "Package unpublication" },
    { pattern: /\bremove\s+(all\s+)?dependenc/i, risk: "medium", reason: "Dependency removal" },
    // Broad refactoring
    { pattern: /\brewrite\s+(everything|all|entire)\b/i, risk: "medium", reason: "Complete rewrite request" },
    { pattern: /\breplace\s+(all|every|entire)\b/i, risk: "medium", reason: "Bulk replacement request" },
    { pattern: /\bmigrate\s+(everything|all|entire)\b/i, risk: "medium", reason: "Complete migration request" },
];
export function analyzeIntent(prompt) {
    const reasons = [];
    let maxRisk = "none";
    const riskOrder = ["none", "low", "medium", "high", "critical"];
    for (const { pattern, risk, reason } of DESTRUCTIVE_PATTERNS) {
        if (pattern.test(prompt)) {
            reasons.push(reason);
            if (riskOrder.indexOf(risk) > riskOrder.indexOf(maxRisk)) {
                maxRisk = risk;
            }
        }
    }
    let suggestedConfirmation = null;
    if (maxRisk === "critical") {
        suggestedConfirmation = "This is a CRITICAL destructive operation. Please confirm you want to proceed by explicitly stating what will be affected.";
    }
    else if (maxRisk === "high") {
        suggestedConfirmation = "This operation could cause data loss. Please confirm you have backups or are okay with the consequences.";
    }
    else if (maxRisk === "medium") {
        suggestedConfirmation = "This operation may have significant side effects. Please confirm the scope of changes.";
    }
    return {
        isDestructive: maxRisk !== "none",
        riskLevel: maxRisk,
        reasons,
        suggestedConfirmation,
    };
}
export function formatIntentWarning(analysis) {
    if (!analysis.isDestructive)
        return "";
    const riskEmoji = {
        low: "INFO",
        medium: "WARN",
        high: "DANGER",
        critical: "CRITICAL",
    };
    const lines = [
        `[${riskEmoji[analysis.riskLevel] || "WARN"}] Potentially destructive intent detected:`,
    ];
    for (const r of analysis.reasons) {
        lines.push(`  - ${r}`);
    }
    if (analysis.suggestedConfirmation) {
        lines.push("");
        lines.push(analysis.suggestedConfirmation);
    }
    return lines.join("\n");
}
