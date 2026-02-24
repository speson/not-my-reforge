// Notification system types

export type NotifyProvider = "discord" | "slack" | "telegram" | "webhook";

export interface NotifyChannel {
  provider: NotifyProvider;
  name: string;
  enabled: boolean;
  webhookUrl: string;
  /** Telegram-specific: chat ID for Bot API */
  chatId?: string;
}

export interface NotifyConfig {
  enabled: boolean;
  channels: NotifyChannel[];
  /** Events that trigger notifications */
  events: NotifyEvent[];
  /** Minimum session duration (seconds) before sending notifications */
  minDurationSec: number;
}

export type NotifyEvent =
  | "session_complete"
  | "team_complete"
  | "ralph_complete"
  | "ralph_failed"
  | "verification_failed"
  | "worker_done";

export interface NotifyMessage {
  event: NotifyEvent;
  title: string;
  body: string;
  project?: string;
  branch?: string;
  timestamp: string;
}

export const DEFAULT_CONFIG: NotifyConfig = {
  enabled: false,
  channels: [],
  events: [
    "session_complete",
    "team_complete",
    "ralph_complete",
    "ralph_failed",
  ],
  minDurationSec: 60,
};
