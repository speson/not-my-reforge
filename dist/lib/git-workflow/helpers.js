// Git workflow helpers — PR metadata, commit formatting, release notes
import { execSync } from "node:child_process";
function exec(cmd, cwd) {
    try {
        const stdout = execSync(cmd, { cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"], timeout: 15000 }).trim();
        return { stdout, ok: true };
    }
    catch (e) {
        const error = e;
        return { stdout: error.stdout || "", ok: false };
    }
}
export function generatePrMetadata(cwd, baseBranch) {
    const head = exec("git branch --show-current", cwd);
    if (!head.ok)
        return null;
    const headBranch = head.stdout;
    const base = baseBranch || exec("git symbolic-ref refs/remotes/origin/HEAD --short 2>/dev/null || echo main", cwd).stdout.replace("origin/", "");
    // Get commits
    const log = exec(`git log --oneline "${base}..${headBranch}" 2>/dev/null`, cwd);
    const commits = log.ok ? log.stdout.split("\n").filter(Boolean) : [];
    // Get changed files
    const diff = exec(`git diff --name-only "${base}...${headBranch}" 2>/dev/null`, cwd);
    const filesChanged = diff.ok ? diff.stdout.split("\n").filter(Boolean) : [];
    // Get stat summary
    const stat = exec(`git diff --stat "${base}...${headBranch}" 2>/dev/null`, cwd);
    const stats = stat.ok ? stat.stdout.split("\n").pop() || "" : "";
    // Generate title from branch name or first commit
    let title = headBranch
        .replace(/^(feature|fix|chore|docs|refactor|test)\//, "")
        .replace(/[-_]/g, " ")
        .replace(/^\w/, (c) => c.toUpperCase());
    if (title.length > 70)
        title = title.slice(0, 67) + "...";
    // Generate body
    const bodyLines = ["## Summary", ""];
    if (commits.length > 0) {
        for (const c of commits.slice(0, 10)) {
            bodyLines.push(`- ${c}`);
        }
        if (commits.length > 10) {
            bodyLines.push(`- ... and ${commits.length - 10} more commits`);
        }
    }
    bodyLines.push("");
    bodyLines.push("## Changed Files");
    for (const f of filesChanged.slice(0, 20)) {
        bodyLines.push(`- \`${f}\``);
    }
    if (filesChanged.length > 20) {
        bodyLines.push(`- ... and ${filesChanged.length - 20} more files`);
    }
    bodyLines.push("");
    bodyLines.push("## Test Plan");
    bodyLines.push("- [ ] Tests pass locally");
    bodyLines.push("- [ ] Build succeeds");
    bodyLines.push("- [ ] Manual verification complete");
    return {
        title,
        body: bodyLines.join("\n"),
        baseBranch: base,
        headBranch,
        commits,
        filesChanged,
        stats,
    };
}
export function formatConventionalCommit(type, scope, description, body, breaking) {
    let msg = type;
    if (scope)
        msg += `(${scope})`;
    if (breaking)
        msg += "!";
    msg += `: ${description}`;
    if (body)
        msg += `\n\n${body}`;
    return msg;
}
export function detectCommitType(files) {
    const hasTests = files.some((f) => f.includes(".test.") || f.includes(".spec.") || f.includes("__tests__"));
    const hasDocs = files.some((f) => f.endsWith(".md") || f.includes("docs/"));
    const hasCI = files.some((f) => f.includes(".github/") || f.includes("Jenkinsfile") || f.includes(".gitlab-ci"));
    const hasSrc = files.some((f) => f.startsWith("src/") || f.endsWith(".ts") || f.endsWith(".js"));
    if (hasTests && !hasSrc)
        return "test";
    if (hasDocs && !hasSrc)
        return "docs";
    if (hasCI)
        return "ci";
    return "feat";
}
export function generateReleaseInfo(cwd, sinceTag) {
    // Get current version from package.json
    const pkgResult = exec('node -e "console.log(require(\'./package.json\').version)" 2>/dev/null', cwd);
    const currentVersion = pkgResult.ok ? pkgResult.stdout : null;
    // Get commits since last tag or specified tag
    const tag = sinceTag || exec("git describe --tags --abbrev=0 2>/dev/null", cwd).stdout;
    const range = tag ? `${tag}..HEAD` : "HEAD~20..HEAD";
    const log = exec(`git log --oneline ${range} 2>/dev/null`, cwd);
    const commits = log.ok ? log.stdout.split("\n").filter(Boolean) : [];
    const features = [];
    const fixes = [];
    const breaking = [];
    const other = [];
    for (const c of commits) {
        const msg = c.replace(/^[a-f0-9]+ /, "");
        if (msg.startsWith("feat"))
            features.push(msg);
        else if (msg.startsWith("fix"))
            fixes.push(msg);
        else if (msg.includes("BREAKING") || msg.includes("!:"))
            breaking.push(msg);
        else
            other.push(msg);
    }
    return { currentVersion, commits, features, fixes, breaking, other };
}
export function formatReleaseNotes(info, newVersion) {
    const lines = [`# Release ${newVersion}`, ""];
    if (info.breaking.length > 0) {
        lines.push("## Breaking Changes");
        for (const c of info.breaking)
            lines.push(`- ${c}`);
        lines.push("");
    }
    if (info.features.length > 0) {
        lines.push("## Features");
        for (const c of info.features)
            lines.push(`- ${c}`);
        lines.push("");
    }
    if (info.fixes.length > 0) {
        lines.push("## Bug Fixes");
        for (const c of info.fixes)
            lines.push(`- ${c}`);
        lines.push("");
    }
    if (info.other.length > 0) {
        lines.push("## Other Changes");
        for (const c of info.other.slice(0, 10))
            lines.push(`- ${c}`);
        if (info.other.length > 10)
            lines.push(`- ... and ${info.other.length - 10} more`);
        lines.push("");
    }
    lines.push(`**Full Changelog**: ${info.commits.length} commits`);
    return lines.join("\n");
}
