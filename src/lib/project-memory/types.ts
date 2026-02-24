export interface ProjectMemory {
  techStack: string[];
  buildCommands: BuildCommands;
  conventions: Convention[];
  hotPaths: string[];
  lastUpdated: string;
}

export interface BuildCommands {
  dev?: string;
  build?: string;
  test?: string;
  lint?: string;
  format?: string;
  [key: string]: string | undefined;
}

export interface Convention {
  type: "naming" | "import" | "structure" | "other";
  pattern: string;
  example?: string;
}

export function createDefaultMemory(): ProjectMemory {
  return {
    techStack: [],
    buildCommands: {},
    conventions: [],
    hotPaths: [],
    lastUpdated: new Date().toISOString(),
  };
}
