// Notification config storage — .reforge/notify-config.json
import { readDataFile, writeDataFile } from "../storage.js";
import { DEFAULT_CONFIG } from "./types.js";
const FILENAME = "notify-config.json";
export function loadNotifyConfig(cwd) {
    return readDataFile(cwd, FILENAME, DEFAULT_CONFIG);
}
export function saveNotifyConfig(cwd, config) {
    writeDataFile(cwd, FILENAME, config);
}
export function addChannel(cwd, channel) {
    const config = loadNotifyConfig(cwd);
    const existing = config.channels.findIndex((c) => c.name === channel.name);
    if (existing >= 0) {
        config.channels[existing] = channel;
    }
    else {
        config.channels.push(channel);
    }
    config.enabled = true;
    saveNotifyConfig(cwd, config);
}
export function removeChannel(cwd, name) {
    const config = loadNotifyConfig(cwd);
    const idx = config.channels.findIndex((c) => c.name === name);
    if (idx < 0)
        return false;
    config.channels.splice(idx, 1);
    if (config.channels.length === 0)
        config.enabled = false;
    saveNotifyConfig(cwd, config);
    return true;
}
export function formatNotifyStatus(config) {
    if (!config.enabled || config.channels.length === 0) {
        return "Notifications: disabled (no channels configured)";
    }
    const lines = [
        `Notifications: ${config.enabled ? "enabled" : "disabled"}`,
        `Min duration: ${config.minDurationSec}s`,
        `Events: ${config.events.join(", ")}`,
        "Channels:",
    ];
    for (const ch of config.channels) {
        const status = ch.enabled ? "ON" : "OFF";
        lines.push(`  [${status}] ${ch.name} (${ch.provider})`);
    }
    return lines.join("\n");
}
