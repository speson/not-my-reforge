// Hook input/output types for Claude Code plugin hooks

export interface HookInput {
  cwd?: string;
  source?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_response?: ToolResponse;
  transcript?: TranscriptMessage[];
}

export interface ToolResponse {
  is_error?: boolean;
  content?: string;
  error?: string;
}

export interface TranscriptMessage {
  role: "user" | "assistant" | "tool";
  content: string | TranscriptContent[];
  timestamp?: number;
}

export interface TranscriptContent {
  type: "text" | "tool_use" | "tool_result";
  text?: string;
  name?: string;
  input?: Record<string, unknown>;
  content?: string;
  is_error?: boolean;
}

export interface PreToolUseInput extends HookInput {
  tool_name: string;
  tool_input: Record<string, unknown>;
}

export interface PermissionRequestInput extends HookInput {
  tool_name: string;
  tool_input: Record<string, unknown>;
  permission_mode?: string;
}

export interface PostToolUseInput extends HookInput {
  tool_name: string;
  tool_input: Record<string, unknown>;
  tool_response: ToolResponse;
}

export interface SessionStartInput extends HookInput {
  cwd: string;
  source: "startup" | "resume";
}

export interface StopInput extends HookInput {
  cwd: string;
  transcript?: TranscriptMessage[];
}

export interface PreCompactInput extends HookInput {
  cwd: string;
  transcript?: TranscriptMessage[];
}

export interface UserPromptSubmitInput extends HookInput {
  cwd: string;
  prompt: string;
}

// Hook output types
export interface HookOutput {
  hookSpecificOutput?: PreToolUseOutput | PermissionRequestOutput | PostToolUseOutput | UserPromptSubmitOutput | SessionStartOutput | StopOutput | PreCompactOutput;
}

export interface PreToolUseOutput {
  hookEventName: "PreToolUse";
  permissionDecision?: "allow" | "deny";
  permissionDecisionReason?: string;
  additionalContext?: string;
}

export interface PermissionRequestOutput {
  hookEventName: "PermissionRequest";
  decision: {
    behavior: "allow" | "deny";
    message?: string;
  };
}

export interface PostToolUseOutput {
  hookEventName: "PostToolUse";
  additionalContext?: string;
}

export interface UserPromptSubmitOutput {
  hookEventName: "UserPromptSubmit";
  additionalContext?: string;
}

export interface SessionStartOutput {
  hookEventName: "SessionStart";
  additionalContext?: string;
  systemMessage?: string;
}

export interface StopOutput {
  hookEventName: "Stop";
  additionalContext?: string;
}

export interface PreCompactOutput {
  hookEventName: "PreCompact";
  systemMessage?: string;
}
