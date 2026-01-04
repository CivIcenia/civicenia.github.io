/**
 * Update Avatars Script
 * 
 * This script fetches current Discord avatar URLs for all officials using the Discord REST API
 * and updates the officials.yml and councillors.yml files.
 * 
 * IMPORTANT: Run this script after sync-officials.ts to ensure icons are populated for all officials.
 * The sync script preserves discord_id but may not have icon URLs from news posts (as they're now optional).
 * This script fills in the missing icons by fetching from Discord.
 * 
 * Requirements:
 * - Discord Bot Token in .env file as DISCORD_BOT_TOKEN
 * - discord_id field populated in YAML files
 * 
 * Usage:
 * bun run update-avatars.ts
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";

// Load environment variables from .env file
// Bun automatically loads .env, but we'll read it explicitly to ensure it's loaded
const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
            const [key, ...valueParts] = trimmed.split("=");
            if (key && valueParts.length > 0) {
                const value = valueParts.join("=").trim();
                process.env[key.trim()] = value;
            }
        }
    }
}

const OFFICIALS_FILE = path.join(process.cwd(), "src/data/officials.yml");
const COUNCILLORS_FILE = path.join(process.cwd(), "src/data/councillors.yml");
const DEFAULT_ICON = "https://cdn.discordapp.com/embed/avatars/0.png";

const DISCORD_API_BASE = "https://discord.com/api/v10";

interface DiscordUser {
    id: string;
    username: string;
    discriminator: string;
    avatar: string | null;
    banner?: string | null;
}

// Load bot token from environment
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

if (!BOT_TOKEN) {
    console.error("❌ Error: DISCORD_BOT_TOKEN not found in environment variables");
    console.error("Please create a .env file with your Discord bot token:");
    console.error("DISCORD_BOT_TOKEN=your_token_here");
    process.exit(1);
}

/**
 * Fetch Discord user data via REST API
 */
async function fetchDiscordUser(userId: string): Promise<DiscordUser | null> {
    try {
        const response = await fetch(`${DISCORD_API_BASE}/users/${userId}`, {
            headers: {
                "Authorization": `Bot ${BOT_TOKEN}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
                console.warn(`⚠️  User ${userId} not found`);
            } else if (response.status === 401) {
                console.error("❌ Invalid bot token");
            } else {
                console.error(`❌ Error fetching user ${userId}: ${response.status} ${response.statusText}`);
            }
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error(`❌ Network error fetching user ${userId}:`, error);
        return null;
    }
}

/**
 * Build Discord CDN avatar URL
 */
function getAvatarUrl(user: DiscordUser, size: number = 256): string {
    if (!user.avatar) {
        // User has no custom avatar, use default
        const defaultNum = parseInt(user.discriminator) % 5;
        return `https://cdn.discordapp.com/embed/avatars/${defaultNum}.png`;
    }
    
    // Determine format (animated avatars start with "a_")
    const format = user.avatar.startsWith("a_") ? "gif" : "webp";
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${format}?size=${size}`;
}

/**
 * Parse YAML file and extract structure with discord_id
 */
function parseYamlFile(filePath: string): any {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    
    const structure: any = {
        comments: [],
        entries: {},
        multiSeat: []
    };
    
    let currentSection: string | null = null;
    let inMultiSeat = false;
    let currentSeat: any = null;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Preserve comments
        if (line.trim().startsWith("#")) {
            structure.comments.push({ line: i, content: line });
            continue;
        }
        
        // Check for top-level keys
        if (line.match(/^(\w+):/)) {
            const match = line.match(/^(\w+):/);
            if (match) {
                currentSection = match[1];
                
                // Check if this is a multi-seat section (senators or councillors)
                if (currentSection === "senators" || currentSection === "councillors") {
                    inMultiSeat = true;
                    structure.multiSeat = [];
                } else if (line.includes(":")) {
                    inMultiSeat = false;
                    // Extract value if on same line
                    const valueMatch = line.match(/^\w+:\s*"?([^"\n]*)"?/);
                    if (valueMatch && valueMatch[1].trim()) {
                        structure.entries[currentSection] = valueMatch[1].trim();
                        currentSection = null;
                    } else {
                        structure.entries[currentSection] = {};
                    }
                }
            }
            continue;
        }
        
        // Handle multi-seat entries
        if (inMultiSeat && line.trim().startsWith("- seat:")) {
            if (currentSeat) {
                structure.multiSeat.push(currentSeat);
            }
            const seatMatch = line.match(/- seat:\s*(\d+)/);
            currentSeat = {
                seat: parseInt(seatMatch![1]),
                name: "",
                icon: DEFAULT_ICON,
                discord_id: ""
            };
            continue;
        }
        
        // Handle properties within sections
        if (currentSection && line.trim() && !inMultiSeat) {
            const propMatch = line.match(/^\s+(\w+):\s*"?([^"\n]*)"?/);
            if (propMatch) {
                const [, key, value] = propMatch;
                structure.entries[currentSection][key] = value.trim();
            }
        } else if (inMultiSeat && currentSeat && line.trim()) {
            const propMatch = line.match(/^\s+(\w+):\s*"?([^"\n]*)"?/);
            if (propMatch) {
                const [, key, value] = propMatch;
                currentSeat[key] = value.trim();
            }
        }
    }
    
    // Add last seat if exists
    if (currentSeat) {
        structure.multiSeat.push(currentSeat);
    }
    
    return structure;
}

/**
 * Update officials YAML file
 */
async function updateOfficials() {
    console.log("📋 Updating government officials...");
    
    const structure = parseYamlFile(OFFICIALS_FILE);
    let updateCount = 0;
    
    // Update single-seat roles
    for (const [role, data] of Object.entries(structure.entries)) {
        if (typeof data === "object" && data !== null && "discord_id" in data) {
            const entry = data as any;
            if (entry.discord_id && entry.discord_id !== "") {
                console.log(`  Fetching avatar for ${entry.name || role} (${entry.discord_id})...`);
                const user = await fetchDiscordUser(entry.discord_id);
                if (user) {
                    entry.icon = getAvatarUrl(user);
                    updateCount++;
                    console.log(`  ✅ Updated ${role}`);
                } else {
                    console.log(`  ⚠️  Skipped ${role} (fetch failed)`);
                }
                // Rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
    }
    
    // Update senators
    for (const senator of structure.multiSeat) {
        if (senator.discord_id && senator.discord_id !== "") {
            console.log(`  Fetching avatar for ${senator.name} (Seat ${senator.seat})...`);
            const user = await fetchDiscordUser(senator.discord_id);
            if (user) {
                senator.icon = getAvatarUrl(user);
                updateCount++;
                console.log(`  ✅ Updated Senator ${senator.seat}`);
            } else {
                console.log(`  ⚠️  Skipped Senator ${senator.seat} (fetch failed)`);
            }
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    
    // Write back to file
    await writeYamlFile(OFFICIALS_FILE, structure, "senators");
    console.log(`✅ Government officials updated (${updateCount} avatars fetched)\n`);
}

/**
 * Update councillors YAML file
 */
async function updateCouncillors() {
    console.log("📋 Updating city officials...");
    
    const structure = parseYamlFile(COUNCILLORS_FILE);
    let updateCount = 0;
    
    // Update single-seat roles
    for (const [role, data] of Object.entries(structure.entries)) {
        if (typeof data === "object" && data !== null && "discord_id" in data) {
            const entry = data as any;
            if (entry.discord_id && entry.discord_id !== "") {
                console.log(`  Fetching avatar for ${entry.name || role} (${entry.discord_id})...`);
                const user = await fetchDiscordUser(entry.discord_id);
                if (user) {
                    entry.icon = getAvatarUrl(user);
                    updateCount++;
                    console.log(`  ✅ Updated ${role}`);
                } else {
                    console.log(`  ⚠️  Skipped ${role} (fetch failed)`);
                }
                // Rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
    }
    
    // Update councillors
    for (const councillor of structure.multiSeat) {
        if (councillor.discord_id && councillor.discord_id !== "") {
            console.log(`  Fetching avatar for ${councillor.name} (Seat ${councillor.seat})...`);
            const user = await fetchDiscordUser(councillor.discord_id);
            if (user) {
                councillor.icon = getAvatarUrl(user);
                updateCount++;
                console.log(`  ✅ Updated Councillor ${councillor.seat}`);
            } else {
                console.log(`  ⚠️  Skipped Councillor ${councillor.seat} (fetch failed)`);
            }
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    
    // Write back to file
    await writeYamlFile(COUNCILLORS_FILE, structure, "councillors");
    console.log(`✅ City officials updated (${updateCount} avatars fetched)\n`);
}

/**
 * Write structure back to YAML file
 */
async function writeYamlFile(filePath: string, structure: any, multiSeatName: string) {
    const isOfficials = multiSeatName === "senators";
    const seatLabel = isOfficials ? "Senate Seats" : "Councillor Seats";
    const numSeats = structure.multiSeat.length;
    
    let content = `# ${isOfficials ? "Government Officials" : "City Councillors"} Data
# This file is managed through Decap CMS and synced from ${isOfficials ? "Official" : "City Official"} Change posts
# Use https://toolscord.com/ to get Discord profile pictures

`;
    
    // Add term
    const termKey = isOfficials ? "senate_term" : "council_term";
    if (structure.entries[termKey]) {
        content += `# ${isOfficials ? "Senate" : "Council"} term label (e.g., "September 2025")
${termKey}: "${structure.entries[termKey]}"\n\n`;
        delete structure.entries[termKey];
    }
    
    // Add single-seat roles
    for (const [role, data] of Object.entries(structure.entries)) {
        if (typeof data === "object" && data !== null) {
            const entry = data as any;
            // Get display name from comment or capitalize role
            const displayName = role.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
            content += `# ${displayName}\n${role}:\n`;
            content += `  name: "${entry.name || ""}"\n`;
            content += `  icon: "${entry.icon || DEFAULT_ICON}"\n`;
            if (entry.discord_id) {
                content += `  discord_id: "${entry.discord_id}"\n`;
            }
            content += `\n`;
        }
    }
    
    // Add multi-seat roles
    content += `# ${seatLabel} - ${numSeats} seats\n${multiSeatName}:\n`;
    for (const seat of structure.multiSeat) {
        content += `  - seat: ${seat.seat}\n`;
        content += `    name: "${seat.name}"\n`;
        content += `    icon: "${seat.icon}"\n`;
        if (seat.discord_id) {
            content += `    discord_id: "${seat.discord_id}"\n`;
        }
    }
    
    fs.writeFileSync(filePath, content);
}

// Main execution
async function main() {
    console.log("=== Discord Avatar Update Script ===\n");
    
    try {
        await updateOfficials();
        await updateCouncillors();
        console.log("=== Update Complete ===");
    } catch (error) {
        console.error("❌ Fatal error:", error);
        process.exit(1);
    }
}

main();
