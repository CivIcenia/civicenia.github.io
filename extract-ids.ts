/**
 * Extract Discord IDs from Icon URLs
 * 
 * Helper script to extract Discord user IDs from existing icon URLs.
 * Useful for migration or verification.
 * 
 * Usage:
 * bun run extract-ids.ts
 */

import fs from "fs";
import path from "path";

const OFFICIALS_FILE = path.join(process.cwd(), "src/data/officials.yml");
const COUNCILLORS_FILE = path.join(process.cwd(), "src/data/councillors.yml");

interface ExtractedId {
    name: string;
    role: string;
    url: string;
    discordId: string | null;
}

/**
 * Extract Discord user ID from avatar URL
 */
function extractDiscordId(url: string): string | null {
    // Match Discord CDN avatar URL pattern
    const match = url.match(/cdn\.discordapp\.com\/avatars\/(\d{17,19})\//);
    return match ? match[1] : null;
}

/**
 * Parse YAML and extract all IDs from URLs
 */
function extractIdsFromFile(filePath: string, fileType: "officials" | "councillors"): ExtractedId[] {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    const extracted: ExtractedId[] = [];
    
    let currentRole: string | null = null;
    let currentName = "";
    let currentUrl = "";
    let currentSeat: number | null = null;
    
    for (const line of lines) {
        // Skip comments and empty lines
        if (line.trim().startsWith("#") || !line.trim()) continue;
        
        // Top-level role
        if (line.match(/^(\w+):/)) {
            const match = line.match(/^(\w+):/);
            if (match && match[1] !== "senators" && match[1] !== "councillors") {
                currentRole = match[1];
                currentSeat = null;
            }
            continue;
        }
        
        // Multi-seat section
        if (line.match(/- seat: (\d+)/)) {
            const match = line.match(/- seat: (\d+)/);
            if (match) {
                // Save previous if exists
                if (currentName && currentUrl) {
                    const discordId = extractDiscordId(currentUrl);
                    extracted.push({
                        name: currentName,
                        role: currentRole || `${fileType === "officials" ? "Senator" : "Councillor"} ${currentSeat}`,
                        url: currentUrl,
                        discordId
                    });
                }
                
                currentSeat = parseInt(match[1]);
                currentRole = fileType === "officials" ? "senator" : "councillor";
                currentName = "";
                currentUrl = "";
            }
            continue;
        }
        
        // Name field
        const nameMatch = line.match(/name:\s*"?([^"\n]+)"?/);
        if (nameMatch) {
            currentName = nameMatch[1].trim();
        }
        
        // Icon field
        const iconMatch = line.match(/icon:\s*"?([^"\n]+)"?/);
        if (iconMatch) {
            currentUrl = iconMatch[1].trim();
            
            // If single-seat role, save immediately
            if (currentRole && currentSeat === null && currentName) {
                const discordId = extractDiscordId(currentUrl);
                extracted.push({
                    name: currentName,
                    role: currentRole,
                    url: currentUrl,
                    discordId
                });
                currentName = "";
                currentUrl = "";
            }
        }
    }
    
    // Save last multi-seat entry if exists
    if (currentName && currentUrl && currentSeat !== null) {
        const discordId = extractDiscordId(currentUrl);
        extracted.push({
            name: currentName,
            role: currentRole || `${fileType === "officials" ? "Senator" : "Councillor"} ${currentSeat}`,
            url: currentUrl,
            discordId
        });
    }
    
    return extracted;
}

// Main execution
console.log("=== Discord ID Extractor ===\n");

console.log("📋 Government Officials:");
console.log("------------------------");
const officials = extractIdsFromFile(OFFICIALS_FILE, "officials");
for (const official of officials) {
    if (official.discordId) {
        console.log(`✅ ${official.name.padEnd(20)} (${official.role.padEnd(25)}) → ${official.discordId}`);
    } else {
        console.log(`❌ ${official.name.padEnd(20)} (${official.role.padEnd(25)}) → No ID found`);
    }
}

console.log("\n📋 City Officials:");
console.log("------------------");
const councillors = extractIdsFromFile(COUNCILLORS_FILE, "councillors");
for (const councillor of councillors) {
    if (councillor.discordId) {
        console.log(`✅ ${councillor.name.padEnd(20)} (${councillor.role.padEnd(25)}) → ${councillor.discordId}`);
    } else {
        console.log(`❌ ${councillor.name.padEnd(20)} (${councillor.role.padEnd(25)}) → No ID found`);
    }
}

console.log("\n=== Summary ===");
console.log(`Total officials: ${officials.length}`);
console.log(`IDs extracted: ${officials.filter(o => o.discordId).length}`);
console.log(`Total councillors: ${councillors.length}`);
console.log(`IDs extracted: ${councillors.filter(c => c.discordId).length}`);
console.log("\nNote: Officials without IDs may have default avatars or invalid URLs.");
