---
name: team-pipeline
description: 5-stage quality pipeline for Agent Teams — Plan, PRD, Execute, Verify, Fix
user_invocable: true
---

# Team Pipeline

A structured 5-stage pipeline for executing complex tasks with Agent Teams.

## Pipeline Stages

### Stage 1: Plan
The **planner** agent creates an implementation plan:
- Analyze the codebase and task requirements
- Identify change points and dependencies
- Produce a structured plan with phases and steps
- Enter plan mode for lead approval

### Stage 2: PRD (Product Requirements Document)
The **lead** converts the approved plan into concrete tasks:
- Create TaskCreate entries for each work unit
- Define clear acceptance criteria per task
- Set task dependencies (blockedBy/blocks)
- Assign tasks to workers

### Stage 3: Execute
**Workers** implement in parallel:
- Each worker operates in an isolated git worktree
- Workers follow their task's acceptance criteria
- **Researcher** gathers information as needed (background)
- **Tester** writes tests for implementations

### Stage 4: Verify
**Reviewer** validates all changes:
- Review each worker's diff against acceptance criteria
- Run full test suite
- Check for type errors and lint issues
- Verdict: APPROVE or REQUEST_CHANGES

### Stage 5: Fix
If verification fails:
- Failed items return to Execute stage
- Workers address reviewer feedback
- Re-verify until all checks pass
- Maximum 3 Fix cycles before escalating to user

## Usage
```
omo team 3 <task description>
```

The pipeline runs automatically when using the team command with the team-pipeline skill.

## Quality Gates
Each stage transition requires:
- Plan → PRD: Lead approval of plan
- PRD → Execute: All tasks created with acceptance criteria
- Execute → Verify: All tasks marked complete
- Verify → Fix/Done: Reviewer verdict
- Fix → Verify: Worker fixes applied
