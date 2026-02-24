// Pipeline orchestration types — multi-stage quality execution
export const DEFAULT_STAGES = [
    {
        name: "plan",
        description: "Analyze the goal, explore the codebase, and create an implementation plan.",
        gates: [],
        maxAttempts: 1,
    },
    {
        name: "implement",
        description: "Execute the plan — write code, create files, modify existing code.",
        gates: [],
        maxAttempts: 1,
    },
    {
        name: "verify",
        description: "Run all quality checks: build, test, lint, type-check.",
        gates: [
            { command: "npm run build --if-present 2>&1", label: "Build", blocking: true },
            { command: "npm test --if-present 2>&1", label: "Tests", blocking: true },
            { command: "npm run lint --if-present 2>&1", label: "Lint", blocking: false },
        ],
        maxAttempts: 1,
    },
    {
        name: "fix",
        description: "Fix issues found during verification. Then re-verify.",
        gates: [],
        maxAttempts: 3,
    },
    {
        name: "review",
        description: "Final review of all changes — code quality, conventions, completeness.",
        gates: [],
        maxAttempts: 1,
    },
];
export function createPipelineState(goal, customGates) {
    const stages = DEFAULT_STAGES.map((s) => ({ ...s, gates: [...s.gates] }));
    // Add custom gates to verify stage
    if (customGates) {
        const verifyStage = stages.find((s) => s.name === "verify");
        if (verifyStage) {
            verifyStage.gates.push(...customGates);
        }
    }
    return {
        active: true,
        goal,
        currentStage: "plan",
        stages,
        history: [],
        fixAttempts: 0,
        maxFixAttempts: 3,
        plan: null,
        startedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
    };
}
