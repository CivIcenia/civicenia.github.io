#!/usr/bin/env node
/**
 * Treaty/document name slugifier
 *
 * Quick clipboard mode (recommended):
 *   1. Copy text to clipboard (e.g., "CDM - Infrapontem Non-Aggression Pact")
 *   2. Run: bun tools/slugify-treaty.ts
 *   3. Result is automatically copied to clipboard
 *
 * File mode:
 *   bun tools/slugify-treaty.ts input.txt
 *
 * Converts:
 *   CDM - Infrapontem Non-Aggression Pact
 *   Neo Sol Non-Aggression Pact
 *   Ruby Treaty of Piave
 *
 * To:
 *   cdm-infrapontem-non-aggression-pact
 *   neo-sol-non-aggression-pact
 *   ruby-treaty-of-piave
 */
import clipboardy from "clipboardy";
import { readFile } from "fs/promises";

function slugify(input: string): string {
  return (
    input
      // Replace newlines, spaces, and existing dashes/hyphens with single hyphen
      .replace(/[\s\n–—‑-]+/g, "-")
      // Remove any non-word characters except hyphens (keep letters, numbers, hyphens)
      .replace(/[^\w-]/g, "")
      // Convert to lowercase
      .toLowerCase()
      // Remove leading/trailing hyphens
      .replace(/^-+|-+$/g, "")
      // Collapse multiple consecutive hyphens
      .replace(/-+/g, "-")
  );
}

async function main() {
  try {
    const args = process.argv.slice(2);

    let input: string;

    if (args.length > 0) {
      // Read from file
      input = await readFile(args[0], "utf-8");
      console.log("Reading from file:", args[0]);
    } else {
      // Read from clipboard
      console.log("Reading from clipboard...");
      input = await clipboardy.read();
    }

    console.log("Input:", JSON.stringify(input));
    const output = slugify(input);

    // Write to clipboard
    await clipboardy.write(output);
    console.log("\n✓ Slugified and copied to clipboard!");
    console.log("Output:");
    console.log(output);
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
