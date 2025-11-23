#!/usr/bin/env bun
import { dev as watch } from "astro";

await watch({
    root: ".",
});

// Create a generated admin config so we don't overwrite the tracked file.
// We'll try to make `decap-server` use it by passing it to common exported APIs.
// If that fails, fall back to a non-destructive replace/restore of the original file.
const fs = await import("fs/promises");
const origPath = "./public/admin/config.yml";
const genPath = "./public/admin/config.generated.yml";

let originalContent: string | null = null;
let replacedOriginal = false;

try {
    originalContent = await fs.readFile(origPath, "utf8");
} catch (err) {
    console.warn(`Could not read original DecapCMS config at ${origPath}:`, err);
    originalContent = null;
}

const envMaybe = process.env.LOCAL_BACKEND;
const shouldLocal = typeof envMaybe === "string"
    ? envMaybe.toLowerCase() === "true"
    : (process.env.NODE_ENV !== "production");

function patchConfigContent(cfg: string | null) {
    const base = cfg ?? "";
    if (/^[ \t]*#?\s*local_backend:/m.test(base)) {
        return base.replace(/^[ \t]*#?\s*local_backend:.*$/m, `local_backend: ${shouldLocal}`);
    }
    return base + `\nlocal_backend: ${shouldLocal}\n`;
}

const genContent = patchConfigContent(originalContent);
try {
    await fs.writeFile(genPath, genContent, "utf8");
    console.log(`Wrote generated DecapCMS config: local_backend=${shouldLocal} (${genPath})`);
} catch (err) {
    console.warn(`Could not write generated config to ${genPath}:`, err);
}

// Helper to restore original config if we ever replaced it.
async function restoreOriginal() {
    if (replacedOriginal && originalContent !== null) {
        try {
            await fs.writeFile(origPath, originalContent, "utf8");
            console.log(`Restored original DecapCMS config at ${origPath}`);
        } catch (e) {
            console.warn(`Failed to restore original DecapCMS config at ${origPath}:`, e);
        }
        replacedOriginal = false;
    }
}

// Register exit handlers to clean up if we did a destructive fallback.
const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM", "SIGHUP"] as any;
for (const s of signals) {
    process.on(s, async () => {
        await restoreOriginal();
        process.exit();
    });
}
process.on("exit", async () => {
    await restoreOriginal();
});

// Try to start decap-server by giving it the generated config. Different versions
// export different shapes, so try a few heuristics.
let decapStarted = false;
try {
    const mod = await import("decap-server");
    const candidateFns: Array<((opts?: any) => Promise<any>) | undefined> = [];

    // common possibilities:
    // - default export is a function: mod.default(...) or mod(...)
    // - named exports: start, serve, default
    const def = (mod && (mod.default ?? mod)) as any;
    if (typeof def === "function") candidateFns.push(def);
    if (mod && typeof (mod.start) === "function") candidateFns.push(mod.start.bind(mod));
    if (mod && typeof (mod.serve) === "function") candidateFns.push(mod.serve.bind(mod));
    if (mod && typeof (mod.run) === "function") candidateFns.push(mod.run.bind(mod));

    for (const fn of candidateFns) {
        if (!fn) continue;
        try {
            // Try passing a `{ config: <path> }` option first
            const maybePromise = fn({ config: genPath });
            // If returns a promise, await it (server may block)
            if (maybePromise && typeof maybePromise.then === "function") {
                await maybePromise;
            }
            decapStarted = true;
            console.log("decap-server started using generated config (via function call)");
            break;
        } catch (err) {
            // Not fatal — try next pattern.
            console.warn("decap-server start attempt failed with config option:", err);
            try {
                // Try calling without options
                const p2 = fn();
                if (p2 && typeof p2.then === "function") {
                    await p2;
                }
                decapStarted = true;
                console.log("decap-server started using generated config (function without args)");
                break;
            } catch (err2) {
                console.warn("decap-server start attempt without args also failed:", err2);
            }
        }
    }
} catch (err) {
    console.warn("Error importing decap-server:", err);
}

// If we couldn't start decap-server by passing the generated config, fall back
// to non-destructive replace (write generated content into the tracked file,
// start decap-server normally, then restore on exit).
if (!decapStarted) {
    try {
        if (originalContent !== null) {
            await fs.writeFile(origPath, genContent, "utf8");
            replacedOriginal = true;
            console.log(`Wrote generated config into ${origPath} (will restore on exit)`);
        }
    } catch (err) {
        console.warn(`Failed to write backup config into ${origPath}:`, err);
    }

    try {
        // final attempt: just import decap-server and let it read the normal path
        await import("decap-server");
        decapStarted = true;
        console.log("decap-server started (fallback using overwritten tracked config)");
    } catch (err) {
        console.error("Failed to start decap-server in all attempted ways:", err);
        // Try to restore immediately if possible
        await restoreOriginal();
    }
}
