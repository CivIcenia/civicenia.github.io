import { mkdir } from "node:fs/promises";
import { join } from "node:path";

/**
 * Tile Downloader for Icenia-Website
 * Downloads map tiles from the remote server to public/tiles/terrain
 */

const BASE_URL = "https://civmc-map.duckdns.org/tiles/terrain";
const OUTPUT_DIR = join(process.cwd(), "public", "tiles", "terrain");

// Configuration: Define zoom levels and coordinate ranges
// Zoom 0 is highest detail, Zoom -5 is lowest detail
const CONFIG = [
    { z: 0, xRange: [-20, -12], yRange: [-21, -13] },    // Icenia City & Surroundings (High Detail)
    // { z: -1, xRange: [-15, 5], yRange: [5, 20] },   // Broader Icenia
    // { z: -2, xRange: [-10, 5], yRange: [0, 15] },   // Regional
    // { z: -3, xRange: [-5, 5], yRange: [-5, 10] },   // Continental
    // { z: -4, xRange: [-3, 3], yRange: [-3, 3] },    // World Overview
    // { z: -5, xRange: [-2, 2], yRange: [-2, 2] },    // World Overview (Low Detail)
];

async function downloadTile(z: number, x: number, y: number) {
    const url = `${BASE_URL}/z${z}/${x},${y}.png`;
    const dir = join(OUTPUT_DIR, `z${z}`);
    const path = join(dir, `${x},${y}.png`);

    try {
        await mkdir(dir, { recursive: true });
        
        const response = await fetch(url);
        if (!response.ok) {
            if (response.status !== 404) {
                console.error(`Failed to download ${url}: ${response.statusText}`);
            }
            return;
        }

        const buffer = await response.arrayBuffer();
        await Bun.write(path, buffer);
        console.log(`Downloaded: z${z}/${x},${y}.png`);
    } catch (error) {
        console.error(`Error downloading z${z}/${x},${y}.png:`, error);
    }
}

async function main() {
    console.log("Starting tile download...");
    console.log(`Output directory: ${OUTPUT_DIR}`);

    for (const level of CONFIG) {
        console.log(`\nProcessing Zoom Level ${level.z}...`);
        let tasks: Promise<void>[] = [];
        
        for (let x = level.xRange[0]; x <= level.xRange[1]; x++) {
            for (let y = level.yRange[0]; y <= level.yRange[1]; y++) {
                tasks.push(downloadTile(level.z, x, y));
                
                // Batch requests to avoid overwhelming the server
                if (tasks.length >= 10) {
                    await Promise.all(tasks);
                    tasks.length = 0;
                }
            }
        }
        await Promise.all(tasks);
    }

    console.log("\nTile download complete!");
}

main();
