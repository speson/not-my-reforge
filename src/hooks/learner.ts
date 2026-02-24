// learner.ts — Learn patterns from successful tool usage (async)
// Event: PostToolUse (async)

import { readStdin } from "../lib/io.js";
import { observePattern, detectNamingConvention, detectImportStyle } from "../lib/learner/pattern-extractor.js";
import { existsSync, readFileSync } from "node:fs";
import type { PostToolUseInput } from "../lib/types.js";

async function main() {
  const input = await readStdin<PostToolUseInput>();
  const cwd = input.cwd;

  if (!cwd) process.exit(0);

  // Only learn from successful tool uses
  if (input.tool_response?.is_error) process.exit(0);

  const toolName = input.tool_name;
  const filePath = input.tool_input?.file_path as string | undefined;

  // Learn file naming conventions from Write/Edit
  if ((toolName === "Write" || toolName === "Edit" || toolName === "Read") && filePath) {
    const convention = detectNamingConvention(filePath);
    if (convention) {
      const relPath = filePath.startsWith(cwd) ? filePath.slice(cwd.length + 1) : filePath;
      observePattern(cwd, "naming", convention, relPath);
    }

    // Learn import style from file content
    if (existsSync(filePath)) {
      try {
        const content = readFileSync(filePath, "utf-8");
        const firstLines = content.split("\n").slice(0, 20);
        for (const line of firstLines) {
          const style = detectImportStyle(line);
          if (style) {
            observePattern(cwd, "import", style, line.trim().slice(0, 80));
            break;
          }
        }
      } catch { /* skip */ }
    }
  }

  // Learn command patterns from Bash
  if (toolName === "Bash") {
    const command = input.tool_input?.command as string | undefined;
    if (command) {
      // Learn successful workflow commands
      const workflows = [
        { pattern: /\bnpm\s+run\s+(\w+)/, type: "command" as const },
        { pattern: /\bcargo\s+(\w+)/, type: "command" as const },
        { pattern: /\bgo\s+(\w+)/, type: "command" as const },
        { pattern: /\bmake\s+(\w+)/, type: "command" as const },
      ];

      for (const { pattern, type } of workflows) {
        const match = command.match(pattern);
        if (match) {
          observePattern(cwd, type, match[0], command.slice(0, 100));
        }
      }
    }
  }
}

main();
