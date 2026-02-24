// Notification sender — webhook-based delivery for Discord, Slack, Telegram

import type { NotifyChannel, NotifyMessage } from "./types.js";

function formatDiscordPayload(msg: NotifyMessage): object {
  return {
    embeds: [
      {
        title: msg.title,
        description: msg.body,
        color: msg.event.includes("failed") ? 0xff4444 : 0x44ff44,
        fields: [
          ...(msg.project ? [{ name: "Project", value: msg.project, inline: true }] : []),
          ...(msg.branch ? [{ name: "Branch", value: msg.branch, inline: true }] : []),
        ],
        timestamp: msg.timestamp,
        footer: { text: "not-my-reforge" },
      },
    ],
  };
}

function formatSlackPayload(msg: NotifyMessage): object {
  const emoji = msg.event.includes("failed") ? ":x:" : ":white_check_mark:";
  const fields = [];
  if (msg.project) fields.push({ type: "mrkdwn", text: `*Project:* ${msg.project}` });
  if (msg.branch) fields.push({ type: "mrkdwn", text: `*Branch:* ${msg.branch}` });

  return {
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: `${emoji} ${msg.title}` },
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: msg.body },
      },
      ...(fields.length > 0
        ? [{ type: "section", fields }]
        : []),
      {
        type: "context",
        elements: [{ type: "mrkdwn", text: `not-my-reforge | ${msg.timestamp}` }],
      },
    ],
  };
}

function formatTelegramPayload(msg: NotifyMessage, chatId: string): object {
  const emoji = msg.event.includes("failed") ? "\u274c" : "\u2705";
  const lines = [
    `${emoji} *${msg.title}*`,
    "",
    msg.body,
  ];
  if (msg.project) lines.push(`\n*Project:* ${msg.project}`);
  if (msg.branch) lines.push(`*Branch:* ${msg.branch}`);

  return {
    chat_id: chatId,
    text: lines.join("\n"),
    parse_mode: "Markdown",
  };
}

function formatGenericPayload(msg: NotifyMessage): object {
  return {
    event: msg.event,
    title: msg.title,
    body: msg.body,
    project: msg.project,
    branch: msg.branch,
    timestamp: msg.timestamp,
    source: "not-my-reforge",
  };
}

async function sendWebhook(url: string, payload: object): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function sendNotification(
  channel: NotifyChannel,
  msg: NotifyMessage
): Promise<boolean> {
  let payload: object;

  switch (channel.provider) {
    case "discord":
      payload = formatDiscordPayload(msg);
      break;
    case "slack":
      payload = formatSlackPayload(msg);
      break;
    case "telegram":
      if (!channel.chatId) return false;
      payload = formatTelegramPayload(msg, channel.chatId);
      break;
    case "webhook":
      payload = formatGenericPayload(msg);
      break;
  }

  return sendWebhook(channel.webhookUrl, payload);
}

export async function broadcastNotification(
  channels: NotifyChannel[],
  msg: NotifyMessage
): Promise<{ sent: number; failed: number }> {
  const enabled = channels.filter((c) => c.enabled);
  const results = await Promise.allSettled(
    enabled.map((c) => sendNotification(c, msg))
  );

  let sent = 0;
  let failed = 0;
  for (const r of results) {
    if (r.status === "fulfilled" && r.value) sent++;
    else failed++;
  }

  return { sent, failed };
}
