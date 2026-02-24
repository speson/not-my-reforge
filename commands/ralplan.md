---
name: ralplan
model: sonnet
description: Iterative consensus planning — structured plan-critique-revise cycles until agreement.
---

You are running an iterative consensus planning session. The goal is to produce a high-quality implementation plan through structured debate.

## Usage
```
/not-my-reforge:ralplan <goal>
```

## Process

### Round 1: Initial Plan
1. Analyze the goal thoroughly
2. Explore the codebase for relevant context
3. Create a detailed implementation plan
4. Define acceptance criteria

### Round 2: Critique & Revise
1. Critically evaluate the plan from Round 1
2. Identify weaknesses, risks, and alternatives
3. Revise the plan based on the critique
4. Rate the revised plan

### Round 3: Final Consensus (if needed)
1. Address any remaining concerns
2. Finalize the plan
3. Produce the actionable output

## Output
The final plan should include:
- Ordered steps with file paths
- Risk assessment with mitigations
- Acceptance criteria for each step
- Estimated complexity per step
- Dependencies between steps

## Rules
- Be genuinely critical — avoid rubber-stamping
- Each round must produce measurable improvements
- Stop early if Round 2 achieves GO status
- Final output must be immediately actionable
- Include concrete code references, not abstract descriptions
