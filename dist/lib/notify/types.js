// Notification system types
export const DEFAULT_CONFIG = {
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
