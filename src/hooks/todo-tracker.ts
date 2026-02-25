// todo-tracker.ts — Track TaskCreate/TaskUpdate/TaskList and sync to todo-state.json
// Event: PostToolUse (async)
// Opens a tmux side pane on first task creation

import { readStdin } from "../lib/io.js";
import { readDataFile, writeDataFile } from "../lib/storage.js";
import { execSync } from "node:child_process";
import type { PostToolUseInput } from "../lib/types.js";
import type { TodoItem, TodoState } from "../lib/todo/types.js";

const TODO_FILE = "todo-state.json";
const PANE_TITLE = "reforge-todo";

function emptyState(): TodoState {
  return { tasks: [], updatedAt: new Date().toISOString() };
}

function openTodoPane(cwd: string): void {
  if (!process.env.TMUX) return;

  try {
    // Check if pane already exists by title
    const panes = execSync("tmux list-panes -F '#{pane_title}'", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    if (panes.split("\n").includes(PANE_TITLE)) return;

    // Find the todo-pane.sh script
    const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT ?? "";
    const script = `${pluginRoot}/scripts/todo-pane.sh`;

    execSync(
      `tmux split-window -h -l 35 -d "bash '${script}' '${cwd}'" \\; select-pane -t '{last}' -T '${PANE_TITLE}'`,
      { stdio: ["pipe", "pipe", "pipe"] },
    );
  } catch {
    // tmux not available or split failed
  }
}

function handleTaskCreate(
  input: PostToolUseInput,
  state: TodoState,
): TodoState {
  const toolInput = input.tool_input;
  const response = input.tool_response;

  // Extract task ID from response (format: "Task #N created successfully...")
  let taskId = "";
  if (response.content) {
    const match = response.content.match(/Task #(\d+)/);
    if (match) taskId = match[1];
  }

  if (!taskId) return state;

  const subject = (toolInput.subject as string) ?? "";
  const activeForm = (toolInput.activeForm as string) ?? undefined;

  // Avoid duplicates
  if (state.tasks.some((t) => t.id === taskId)) return state;

  state.tasks.push({
    id: taskId,
    subject,
    status: "pending",
    activeForm,
  });
  state.updatedAt = new Date().toISOString();
  return state;
}

function handleTaskUpdate(
  input: PostToolUseInput,
  state: TodoState,
): TodoState {
  const toolInput = input.tool_input;
  const taskId = toolInput.taskId as string;
  if (!taskId) return state;

  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) return state;

  if (toolInput.status) {
    const newStatus = toolInput.status as string;
    if (
      newStatus === "pending" ||
      newStatus === "in_progress" ||
      newStatus === "completed"
    ) {
      task.status = newStatus;
    }
    if (newStatus === "deleted") {
      state.tasks = state.tasks.filter((t) => t.id !== taskId);
    }
  }
  if (toolInput.subject) {
    task.subject = toolInput.subject as string;
  }
  if (toolInput.activeForm) {
    task.activeForm = toolInput.activeForm as string;
  }

  state.updatedAt = new Date().toISOString();
  return state;
}

function handleTaskList(
  input: PostToolUseInput,
  state: TodoState,
): TodoState {
  const response = input.tool_response;
  if (!response.content || response.is_error) return state;

  // TaskList response contains task summaries, parse them to sync state
  // Format varies but typically includes: id, subject, status
  // We parse line by line looking for task entries
  const lines = response.content.split("\n");
  const parsed: TodoItem[] = [];

  for (const line of lines) {
    // Match patterns like "- #1: Subject (status)" or "id: 1, subject: ..., status: ..."
    const idMatch = line.match(/(?:#|id:\s*)(\d+)/i);
    if (!idMatch) continue;

    const id = idMatch[1];
    let status: TodoItem["status"] = "pending";
    if (/in.?progress/i.test(line)) status = "in_progress";
    else if (/completed|done/i.test(line)) status = "completed";

    // Extract subject — text after the id pattern, before status indicators
    const subjectMatch = line.match(/(?:#\d+[:\s]+|subject:\s*)(.*?)(?:\s*\(|$)/i);
    const subject = subjectMatch?.[1]?.trim() ?? state.tasks.find((t) => t.id === id)?.subject ?? `Task ${id}`;

    const existing = state.tasks.find((t) => t.id === id);
    parsed.push({
      id,
      subject: subject || existing?.subject || `Task ${id}`,
      status,
      activeForm: existing?.activeForm,
    });
  }

  if (parsed.length > 0) {
    state.tasks = parsed;
    state.updatedAt = new Date().toISOString();
  }
  return state;
}

async function main() {
  const input = await readStdin<PostToolUseInput>();
  const cwd = input.cwd;

  if (!cwd) process.exit(0);
  if (input.tool_response?.is_error) process.exit(0);

  const toolName = input.tool_name;
  if (!toolName) process.exit(0);

  let state = readDataFile<TodoState>(cwd, TODO_FILE, emptyState());

  switch (toolName) {
    case "TaskCreate":
      state = handleTaskCreate(input, state);
      break;
    case "TaskUpdate":
      state = handleTaskUpdate(input, state);
      break;
    case "TaskList":
      state = handleTaskList(input, state);
      break;
    default:
      process.exit(0);
  }

  writeDataFile(cwd, TODO_FILE, state);

  // Open tmux pane on first task or if pane was closed
  if (state.tasks.length > 0) {
    openTodoPane(cwd);
  }
}

main();
