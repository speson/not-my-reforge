export function createDefaultMemory() {
    return {
        techStack: [],
        buildCommands: {},
        conventions: [],
        hotPaths: [],
        lastUpdated: new Date().toISOString(),
    };
}
