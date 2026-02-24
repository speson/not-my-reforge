// comment-checker.ts — Detect AI slop comments in written/edited files
// Event: PostToolUse (Write|Edit)

import { readStdin, writeOutput } from "../lib/io.js";
import { findSlopComments } from "../lib/patterns.js";
import { existsSync, readFileSync } from "node:fs";
import { basename } from "node:path";
import type { PostToolUseInput } from "../lib/types.js";

async function main() {
  const input = await readStdin<PostToolUseInput>();
  const filePath = input.tool_input?.file_path as string | undefined;

  if (!filePath || !existsSync(filePath)) process.exit(0);

  const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT || process.cwd();

  let content: string;
  try {
    content = readFileSync(filePath, "utf-8");
  } catch {
    process.exit(0);
  }

  const matches = findSlopComments(content!, filePath, pluginRoot);

  if (matches.length > 0) {
    const matchLines = matches
      .slice(0, 10)
      .map((m) => `  - Pattern '${m.pattern}': ${m.line}`)
      .join("\n");

    writeOutput({
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: `AI slop comments detected in ${basename(filePath)}:\n${matchLines}\n\nPlease remove or rewrite these comments to be genuinely useful, or remove them entirely. Good comments explain WHY, not WHAT.`,
      },
    });
  }
}

main();
