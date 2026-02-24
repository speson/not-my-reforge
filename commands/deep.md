---
name: deep
description: Deep analysis with opus model. Use for complex debugging, architectural decisions, difficult bugs, security analysis, and tasks requiring careful reasoning.
model: opus
argument-hint: [task description]
---

Perform a thorough, deep analysis of the following task. Take your time to think carefully.

## Approach
1. **Understand**: Read all relevant files thoroughly before acting
2. **Analyze**: Consider multiple approaches, trade-offs, and edge cases
3. **Research**: Use WebSearch if the topic involves external libraries or unfamiliar patterns
4. **Plan**: Outline your approach before implementing
5. **Execute**: Implement with careful attention to correctness and completeness
6. **Verify**: Check your work — re-read modified files, consider edge cases

## Rules
- Read before writing — always understand context first
- Consider at least 2 alternative approaches before choosing one
- Explicitly state assumptions and risks
- Reference specific file:line for all findings
- If modifying code: verify the change doesn't break related functionality

## Task
$ARGUMENTS
