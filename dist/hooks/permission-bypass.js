// permission-bypass.ts — Auto-approve permission dialogs when yolo mode is ON
// Event: PermissionRequest
import { readStdin, writeOutput } from "../lib/io.js";
import { isYoloEnabled } from "../lib/yolo/settings.js";
async function main() {
    const input = await readStdin();
    const cwd = input.cwd;
    if (!cwd)
        process.exit(0);
    if (!isYoloEnabled(cwd))
        process.exit(0);
    writeOutput({
        hookSpecificOutput: {
            hookEventName: "PermissionRequest",
            decision: {
                behavior: "allow",
            },
        },
    });
}
main();
