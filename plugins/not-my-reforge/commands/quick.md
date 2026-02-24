---
name: quick
description: Fast execution with haiku model. Use for simple questions, quick lookups, small edits, and tasks where speed matters more than depth.
model: haiku
argument-hint: [task description]
allowed-tools: Read, Glob, Grep, Edit, Write
---

Execute the following task quickly and concisely. Prioritize speed over thoroughness.

## Rules
- Keep responses under 200 words
- Make minimal tool calls — only what's strictly necessary
- Skip detailed analysis; go straight to the answer or action
- One-shot execution: don't iterate unless the first attempt fails
- For code changes: make the edit directly, don't explain first

## Task
$ARGUMENTS
