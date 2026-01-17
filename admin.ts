#!/usr/bin/env bun
import { dev as watch } from "astro";

// Check for required dependencies
const requiredDeps = ['astro', 'decap-server'];
const missingDeps: string[] = [];

for (const dep of requiredDeps) {
    try {
        await import.meta.resolve(dep);
    } catch {
        missingDeps.push(dep);
    }
}

if (missingDeps.length > 0) {
    console.error('\x1b[31m%s\x1b[0m', '❌ Missing required dependencies:');
    missingDeps.forEach(dep => console.error('  - ' + dep));
    console.error('\x1b[33m%s\x1b[0m', '\nPlease run: npm install');
    process.exit(1);
}

console.log('\x1b[32m%s\x1b[0m', '✓ All dependencies are installed');

await watch({
    root: ".",
});

await import("decap-server");
