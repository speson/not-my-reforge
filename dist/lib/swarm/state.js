// Swarm state management — .reforge/swarm-state.json
import { readDataFile, writeDataFile } from "../storage.js";
const FILENAME = "swarm-state.json";
export function loadSwarmState(cwd) {
    const state = readDataFile(cwd, FILENAME, null);
    if (!state || !state.active)
        return null;
    return state;
}
export function saveSwarmState(cwd, state) {
    state.lastActivityAt = new Date().toISOString();
    writeDataFile(cwd, FILENAME, state);
}
export function clearSwarmState(cwd) {
    writeDataFile(cwd, FILENAME, { active: false });
}
export function getPendingTasks(state) {
    return state.tasks.filter((t) => t.status === "pending");
}
export function getAssignableTasks(state) {
    const assigned = state.tasks.filter((t) => t.status === "assigned").length;
    const available = state.config.concurrency - assigned;
    if (available <= 0)
        return [];
    return getPendingTasks(state).slice(0, available);
}
export function assignTask(state, taskId) {
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task || task.status !== "pending")
        return null;
    task.status = "assigned";
    task.startedAt = new Date().toISOString();
    return task;
}
export function completeTask(state, taskId, result) {
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task)
        return;
    task.status = "done";
    task.result = result;
    task.completedAt = new Date().toISOString();
}
export function failTask(state, taskId, error) {
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task)
        return;
    task.status = "failed";
    task.error = error;
    task.completedAt = new Date().toISOString();
}
export function isSwarmComplete(state) {
    return state.tasks.every((t) => t.status === "done" || t.status === "failed");
}
export function formatSwarmStatus(state) {
    const done = state.tasks.filter((t) => t.status === "done").length;
    const failed = state.tasks.filter((t) => t.status === "failed").length;
    const assigned = state.tasks.filter((t) => t.status === "assigned").length;
    const pending = state.tasks.filter((t) => t.status === "pending").length;
    const lines = [
        `[Swarm: ${state.goal}]`,
        `Progress: ${done}/${state.tasks.length} done, ${assigned} active, ${pending} pending, ${failed} failed`,
        `Concurrency: ${state.config.concurrency}`,
        "",
        "Tasks:",
    ];
    for (const t of state.tasks) {
        const icons = { pending: "-", assigned: ">", done: "v", failed: "x" };
        let line = `  [${icons[t.status]}] #${t.id} (${t.agentType}/${t.modelTier}): ${t.description}`;
        if (t.status === "failed" && t.error)
            line += ` — ${t.error}`;
        lines.push(line);
    }
    return lines.join("\n");
}
export function formatSwarmContext(state) {
    const assignable = getAssignableTasks(state);
    const lines = [
        "=== SWARM MODE ACTIVE ===",
        `Goal: ${state.goal}`,
        "",
    ];
    if (assignable.length > 0) {
        lines.push("Tasks to dispatch (use Task tool with appropriate agent):");
        for (const t of assignable) {
            lines.push(`  #${t.id}: ${t.description}`);
            lines.push(`    → Agent: ${t.agentType}, Model: ${t.modelTier}`);
        }
        lines.push("");
        lines.push("Dispatch each task using the Task tool:");
        lines.push('  Task(subagent_type="general-purpose", prompt="<task description>", model="<tier>")');
    }
    const assigned = state.tasks.filter((t) => t.status === "assigned");
    if (assigned.length > 0) {
        lines.push(`Active tasks: ${assigned.length}/${state.config.concurrency} slots used`);
    }
    const done = state.tasks.filter((t) => t.status === "done");
    if (done.length > 0) {
        lines.push("");
        lines.push("Completed:");
        for (const t of done) {
            const snippet = t.result ? t.result.slice(0, 100) + (t.result.length > 100 ? "..." : "") : "(no result)";
            lines.push(`  #${t.id}: ${snippet}`);
        }
    }
    if (isSwarmComplete(state)) {
        lines.push("");
        lines.push("All tasks complete. Aggregate results and present summary.");
    }
    return lines.join("\n");
}
export function formatSwarmReport(state) {
    const lines = [
        `=== Swarm Report: ${state.goal} ===`,
        "",
    ];
    const done = state.tasks.filter((t) => t.status === "done");
    const failed = state.tasks.filter((t) => t.status === "failed");
    lines.push(`Results: ${done.length} completed, ${failed.length} failed out of ${state.tasks.length} total`);
    lines.push("");
    for (const t of done) {
        lines.push(`--- Task #${t.id}: ${t.description} ---`);
        lines.push(t.result || "(no result)");
        lines.push("");
    }
    if (failed.length > 0) {
        lines.push("--- Failed Tasks ---");
        for (const t of failed) {
            lines.push(`#${t.id}: ${t.description} — ${t.error || "unknown error"}`);
        }
    }
    return lines.join("\n");
}
