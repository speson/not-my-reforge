// mode-guard.ts — Check mode conflicts before mode activation
// Event: UserPromptSubmit
// Runs before individual mode init hooks to catch conflicts early
import { readStdin, writeOutput } from "../lib/io.js";
import { loadRegistry, isCancelCoolingDown, getConflicts } from "../lib/mode-registry/registry.js";
const MODE_TRIGGERS = [
    { pattern: /^reforge\s+loop\b/i, mode: "ralph" },
    { pattern: /^reforge\s+autopilot\b/i, mode: "autopilot" },
    { pattern: /^reforge\s+pipeline\b/i, mode: "pipeline" },
    { pattern: /^reforge\s+team\b/i, mode: "team" },
    { pattern: /^reforge\s+swarm\b/i, mode: "swarm" },
    { pattern: /^reforge\s+qa\b/i, mode: "qa" },
    { pattern: /^reforge\s+ralplan\b/i, mode: "ralplan" },
];
async function main() {
    const input = await readStdin();
    const cwd = input.cwd;
    const prompt = input.prompt?.trim() || "";
    if (!cwd || !prompt)
        process.exit(0);
    // Skip cancel commands
    if (/^reforge\s+(cancel|stop|abort)\b/i.test(prompt))
        process.exit(0);
    // Find which mode is being triggered
    const trigger = MODE_TRIGGERS.find((t) => t.pattern.test(prompt));
    if (!trigger)
        process.exit(0);
    const registry = loadRegistry(cwd);
    // Check cancel cooldown
    if (isCancelCoolingDown(registry, trigger.mode)) {
        const sentinel = registry.cancelSentinel;
        const remaining = Math.ceil((sentinel.ttlMs - (Date.now() - sentinel.cancelledAt)) / 1000);
        writeOutput({
            hookSpecificOutput: {
                hookEventName: "PostToolUse",
                additionalContext: [
                    `[Mode Guard] ${trigger.mode} was recently cancelled.`,
                    `Wait ${remaining}s before reactivating (prevents race conditions).`,
                    "This cooldown prevents accidental re-triggering after cancel.",
                ].join("\n"),
            },
        });
        return;
    }
    // Check mode conflicts
    const conflicts = getConflicts(registry, trigger.mode);
    if (conflicts.length > 0) {
        writeOutput({
            hookSpecificOutput: {
                hookEventName: "PostToolUse",
                additionalContext: [
                    `[Mode Guard] Cannot activate "${trigger.mode}": conflicts with active mode "${conflicts[0]}".`,
                    `These modes cannot run simultaneously.`,
                    `Cancel the active mode first: "reforge cancel ${conflicts[0]}"`,
                    "",
                    `Active mode: ${registry.activeMode?.name} (since ${new Date(registry.activeMode?.activatedAt || 0).toLocaleTimeString()})`,
                    registry.activeMode?.goal ? `Goal: ${registry.activeMode.goal}` : "",
                ].filter(Boolean).join("\n"),
            },
        });
        return;
    }
}
main();
