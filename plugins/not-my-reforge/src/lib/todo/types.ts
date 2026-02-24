// Todo pane state types

export interface TodoItem {
  id: string;
  subject: string;
  status: "pending" | "in_progress" | "completed";
  activeForm?: string;
}

export interface TodoState {
  tasks: TodoItem[];
  updatedAt: string;
}
