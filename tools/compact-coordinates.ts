#!/usr/bin/env node
/**
 * Compact coordinate formatter
 *
 * Quick clipboard mode (recommended):
 *   1. Copy coordinates to clipboard
 *   2. Run: bun tools/compact-coordinates.ts
 *   3. Result is automatically copied to clipboard
 *
 * File mode:
 *   bun tools/compact-coordinates.ts input.txt
 *
 * Converts loose format:
 *   [
 *     [ -9156, 107 ],
 *     [ -9166, 125 ],
 *   ]
 *
 * To compact format:
 *   [[-9156,107],[-9166,125]]
 */
import clipboardy from "clipboardy";
import { readFile } from "fs/promises";

function compactCoordinates(input: string): string {
  // Remove all whitespace (including tabs, newlines, spaces)
  const noWhitespace = input.replace(/\s+/g, "");

  // Check if input contains the brackets (allow whitespace around them)
  if (!noWhitespace.includes("[[") || !noWhitespace.includes("]]")) {
    throw new Error("Input must contain [[ and ]]");
  }

  return noWhitespace;
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

    const output = compactCoordinates(input);

    // Write to clipboard
    await clipboardy.write(output);
    console.log("\n✓ Compacted and copied to clipboard!");
    console.log("Output:");
    console.log(output);
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
