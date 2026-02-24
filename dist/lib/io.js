// Stdin/stdout/stderr I/O utilities for hooks
export async function readStdin() {
    const chunks = [];
    for await (const chunk of process.stdin) {
        chunks.push(chunk);
    }
    const raw = Buffer.concat(chunks).toString("utf-8").trim();
    if (!raw) {
        return {};
    }
    try {
        return JSON.parse(raw);
    }
    catch {
        return {};
    }
}
export function writeOutput(output) {
    process.stdout.write(JSON.stringify(output, null, 2) + "\n");
}
export function writeError(message) {
    process.stderr.write(message + "\n");
}
