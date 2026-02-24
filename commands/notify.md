---
name: notify
model: sonnet
description: Configure notification channels for session completion alerts (Discord, Slack, Telegram).
---

You are configuring not-my-reforge notification channels. Help the user set up alerts.

## Usage

Parse the user's request to determine the action:

### Add a channel
```
/not-my-reforge:notify add discord <webhook-url>
/not-my-reforge:notify add slack <webhook-url>
/not-my-reforge:notify add telegram <bot-token> <chat-id>
```

### Remove a channel
```
/not-my-reforge:notify remove <channel-name>
```

### Show status
```
/not-my-reforge:notify status
```

### Toggle
```
/not-my-reforge:notify enable
/not-my-reforge:notify disable
```

## Implementation

The notification config is stored at `.reforge/notify-config.json`. Use these operations:

### Adding Discord
1. Create/update `.reforge/notify-config.json` with a Discord channel entry:
   ```json
   {
     "enabled": true,
     "channels": [{
       "provider": "discord",
       "name": "discord-main",
       "enabled": true,
       "webhookUrl": "<user-provided-url>"
     }],
     "events": ["session_complete", "team_complete", "ralph_complete", "ralph_failed"],
     "minDurationSec": 60
   }
   ```

### Adding Slack
Same structure but `"provider": "slack"`.

### Adding Telegram
For Telegram, the webhook URL format is: `https://api.telegram.org/bot<TOKEN>/sendMessage`
Also requires `chatId` field.

## Notification Events
- `session_complete` — When a session ends (after minDuration)
- `team_complete` — When all team workers finish
- `ralph_complete` — When Ralph Loop succeeds
- `ralph_failed` — When Ralph Loop fails
- `verification_failed` — When verification gate blocks
- `worker_done` — When a team worker completes

## Security Notes
- Webhook URLs contain secrets — remind user to keep `.reforge/` in `.gitignore`
- Verify `.gitignore` includes `.reforge/` directory
- Never display full webhook URLs in output (mask middle portion)
