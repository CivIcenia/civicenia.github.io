/**
 * Sync Officials Script
 * 
 * This script reads all official change news posts and updates the officials.yml
 * and councillors.yml files with the latest officials based on change posts.
 * 
 * Run this before build to ensure officials data is in sync with news posts.
 */

import * as fs from "fs";
import * as path from "path";
import matter from "gray-matter";

const NEWS_DIR = path.join(process.cwd(), "src/content/news");
const CITY_NEWS_DIR = path.join(process.cwd(), "src/content/city-news");
const OFFICIALS_FILE = path.join(process.cwd(), "src/data/officials.yml");
const COUNCILLORS_FILE = path.join(process.cwd(), "src/data/councillors.yml");

const DEFAULT_ICON = "https://cdn.discordapp.com/embed/avatars/0.png";

interface OfficialEntry {
    name: string;
    role: string;
    action: string;
    icon?: string;
    seat?: number;
}

interface ChangePost {
    date: Date;
    changetype: string;
    officials: OfficialEntry[];
    headline: string;
    senate_size?: number;
}

// Role mappings for government officials
const GOV_ROLE_MAP: Record<string, string> = {
    "president": "president",
    "secretary-of-defense": "secretary_of_defense",
    "secretary-of-interior": "secretary_of_interior",
    "secretary-of-treasury": "secretary_of_treasury",
    "speaker-of-the-senate": "speaker",
    "senator": "senator"
};

// Role mappings for city officials
const CITY_ROLE_MAP: Record<string, string> = {
    "mayor": "mayor",
    "deputy-mayor": "deputy_mayor",
    "councillor": "councillor"
};

function parseDate(dateStr: string | Date): Date {
    if (dateStr instanceof Date) return dateStr;
    return new Date(dateStr);
}

function readChangesPosts(directory: string, filterField: string): ChangePost[] {
    if (!fs.existsSync(directory)) {
        console.log(`Directory not found: ${directory}`);
        return [];
    }

    const files = fs.readdirSync(directory).filter(f => f.endsWith(".md"));
    const changes: ChangePost[] = [];

    for (const file of files) {
        const filePath = path.join(directory, file);
        const content = fs.readFileSync(filePath, "utf-8");
        const { data } = matter(content);

        if (data[filterField] === true && data.officials && Array.isArray(data.officials)) {
            changes.push({
                date: parseDate(data.date),
                changetype: data.changetype,
                officials: data.officials,
                headline: data.headline,
                senate_size: data.senate_size
            });
        }
    }

    // Sort by date, newest first
    return changes.sort((a, b) => b.date.getTime() - a.date.getTime());
}

function syncGovernmentOfficials() {
    console.log("Syncing government officials...");
    
    const changes = readChangesPosts(NEWS_DIR, "officialchange");
    console.log(`Found ${changes.length} government official change posts`);

    if (changes.length === 0) {
        console.log("No government official changes found, skipping sync");
        return;
    }

    // Read current officials file
    const currentContent = fs.readFileSync(OFFICIALS_FILE, "utf-8");
    const lines = currentContent.split("\n");
    
    // Track the latest official for each role/seat
    const latestOfficials: Record<string, { name: string; icon: string; seat?: number }> = {};
    const latestSenators: Map<number, { name: string; icon: string }> = new Map();
    let latestSenateTerm = "";
    let latestSenateSize = 7; // Default to 7

    // Process changes from oldest to newest (so newest overwrites)
    const sortedChanges = [...changes].reverse();
    
    for (const change of sortedChanges) {
        // Update senate term from senate elections
        if (change.changetype === "senate-election" || change.changetype === "senate-byelection") {
            // Extract term from headline (e.g., "November 2025 Senate Election" -> "November 2025")
            const termMatch = change.headline.match(/^(\w+\s+\d{4})/);
            if (termMatch) {
                latestSenateTerm = termMatch[1];
            }
            
            // Update senate size if specified in the post
            // We need to cast change to any because we're accessing a property that might not be in the interface yet
            if ((change as any).senate_size) {
                latestSenateSize = (change as any).senate_size;
            }
        }

        for (const official of change.officials) {
            // Skip resignations/removals - they clear the position
            if (official.action === "resigned" || official.action === "removed") {
                const yamlRole = GOV_ROLE_MAP[official.role];
                if (yamlRole === "senator" && official.seat) {
                    latestSenators.set(official.seat, { name: "", icon: DEFAULT_ICON });
                } else if (yamlRole) {
                    latestOfficials[yamlRole] = { name: "", icon: DEFAULT_ICON };
                }
                continue;
            }

            const yamlRole = GOV_ROLE_MAP[official.role];
            if (!yamlRole) {
                console.warn(`Unknown role: ${official.role}`);
                continue;
            }

            if (yamlRole === "senator") {
                // Only update senators if they have a seat number
                if (official.seat) {
                    latestSenators.set(official.seat, {
                        name: official.name,
                        icon: official.icon || DEFAULT_ICON
                    });
                } else {
                    console.warn(`  - Senator "${official.name}" has no seat number, skipping update`);
                }
            } else {
                latestOfficials[yamlRole] = {
                    name: official.name,
                    icon: official.icon || DEFAULT_ICON
                };
            }
        }
    }

    // Now rebuild the YAML file
    let newContent = `# Government Officials Data
# This file is managed through Decap CMS and synced from Official Change posts
# Use https://toolscord.com/ to get Discord profile pictures

# Senate term label (e.g., "September 2025")
senate_term: "${latestSenateTerm || extractCurrentTerm(currentContent)}"

# Executive Branch Officials - Fixed slots with role icons
president:
  name: "${latestOfficials.president?.name || extractValue(currentContent, 'president', 'name')}"
  icon: "${latestOfficials.president?.icon || extractValue(currentContent, 'president', 'icon') || DEFAULT_ICON}"

secretary_of_defense:
  name: "${latestOfficials.secretary_of_defense?.name || extractValue(currentContent, 'secretary_of_defense', 'name')}"
  icon: "${latestOfficials.secretary_of_defense?.icon || extractValue(currentContent, 'secretary_of_defense', 'icon') || DEFAULT_ICON}"

secretary_of_interior:
  name: "${latestOfficials.secretary_of_interior?.name || extractValue(currentContent, 'secretary_of_interior', 'name')}"
  icon: "${latestOfficials.secretary_of_interior?.icon || extractValue(currentContent, 'secretary_of_interior', 'icon') || DEFAULT_ICON}"

secretary_of_treasury:
  name: "${latestOfficials.secretary_of_treasury?.name || extractValue(currentContent, 'secretary_of_treasury', 'name')}"
  icon: "${latestOfficials.secretary_of_treasury?.icon || extractValue(currentContent, 'secretary_of_treasury', 'icon') || DEFAULT_ICON}"

# Speaker of the Senate - Fixed slot
speaker:
  name: "${latestOfficials.speaker?.name || extractValue(currentContent, 'speaker', 'name')}"
  icon: "${latestOfficials.speaker?.icon || extractValue(currentContent, 'speaker', 'icon') || DEFAULT_ICON}"

# Senate Seats - Fixed numbered slots (${latestSenateSize} seats)
senators:
`;

    // Add senators
    const currentSenators = extractSenators(currentContent);
    for (let seat = 1; seat <= latestSenateSize; seat++) {
        const senator = latestSenators.get(seat) || currentSenators.get(seat) || { name: "", icon: DEFAULT_ICON };
        newContent += `  - seat: ${seat}
    name: "${senator.name}"
    icon: "${senator.icon}"
`;
    }

    fs.writeFileSync(OFFICIALS_FILE, newContent);
    console.log("Government officials synced successfully!");
}

function syncCityOfficials() {
    console.log("Syncing city officials...");
    
    const changes = readChangesPosts(CITY_NEWS_DIR, "cityofficialchange");
    console.log(`Found ${changes.length} city official change posts`);

    if (changes.length === 0) {
        console.log("No city official changes found, skipping sync");
        return;
    }

    // Read current councillors file
    const currentContent = fs.readFileSync(COUNCILLORS_FILE, "utf-8");
    
    // Track the latest official for each role/seat
    const latestOfficials: Record<string, { name: string; icon: string }> = {};
    const latestCouncillors: Map<number, { name: string; icon: string }> = new Map();
    let latestCouncilTerm = "";

    // Process changes from oldest to newest (so newest overwrites)
    const sortedChanges = [...changes].reverse();
    
    for (const change of sortedChanges) {
        // Update council term from elections
        if (change.changetype === "council-election" || change.changetype === "council-byelection") {
            const termMatch = change.headline.match(/^(\w+\s+\d{4})/);
            if (termMatch) {
                latestCouncilTerm = termMatch[1];
            }
        }

        for (const official of change.officials) {
            // Skip resignations/removals
            if (official.action === "resigned" || official.action === "removed") {
                const yamlRole = CITY_ROLE_MAP[official.role];
                if (yamlRole === "councillor" && official.seat) {
                    latestCouncillors.set(official.seat, { name: "", icon: DEFAULT_ICON });
                } else if (yamlRole) {
                    latestOfficials[yamlRole] = { name: "", icon: DEFAULT_ICON };
                }
                continue;
            }

            const yamlRole = CITY_ROLE_MAP[official.role];
            if (!yamlRole) {
                console.warn(`Unknown city role: ${official.role}`);
                continue;
            }

            if (yamlRole === "councillor" && official.seat) {
                latestCouncillors.set(official.seat, {
                    name: official.name,
                    icon: official.icon || DEFAULT_ICON
                });
            } else {
                latestOfficials[yamlRole] = {
                    name: official.name,
                    icon: official.icon || DEFAULT_ICON
                };
            }
        }
    }

    // Now rebuild the YAML file
    let newContent = `# City Councillors Data
# This file is managed through Decap CMS and synced from City Official Change posts
# Use https://toolscord.com/ to get Discord profile pictures

council_term: "${latestCouncilTerm || extractSimpleValue(currentContent, 'council_term')}"

mayor:
  name: "${latestOfficials.mayor?.name || extractValue(currentContent, 'mayor', 'name')}"
  icon: "${latestOfficials.mayor?.icon || extractValue(currentContent, 'mayor', 'icon') || DEFAULT_ICON}"

deputy_mayor:
  name: "${latestOfficials.deputy_mayor?.name || extractValue(currentContent, 'deputy_mayor', 'name') || ''}"
  icon: "${latestOfficials.deputy_mayor?.icon || extractValue(currentContent, 'deputy_mayor', 'icon') || DEFAULT_ICON}"

councillors:
`;

    // Add councillors
    const currentCouncillors = extractCouncillors(currentContent);
    for (let seat = 1; seat <= 5; seat++) {
        const councillor = latestCouncillors.get(seat) || currentCouncillors.get(seat) || { name: "", icon: DEFAULT_ICON };
        newContent += `  - seat: ${seat}
    name: "${councillor.name}"
    icon: "${councillor.icon}"
`;
    }

    fs.writeFileSync(COUNCILLORS_FILE, newContent);
    console.log("City officials synced successfully!");
}

// Helper functions to extract values from existing YAML
function extractCurrentTerm(content: string): string {
    const match = content.match(/senate_term:\s*"?([^"\n]+)"?/);
    return match ? match[1].trim() : "Current Term";
}

function extractSimpleValue(content: string, key: string): string {
    const match = content.match(new RegExp(`${key}:\\s*"?([^"\\n]+)"?`));
    return match ? match[1].trim() : "";
}

function extractValue(content: string, section: string, key: string): string {
    // Find the section and then the key within it
    const sectionRegex = new RegExp(`^${section}:\\s*$`, 'm');
    const sectionMatch = content.match(sectionRegex);
    if (!sectionMatch) return "";
    
    const startIndex = sectionMatch.index! + sectionMatch[0].length;
    const restContent = content.slice(startIndex);
    
    // Find the value before the next top-level key
    const nextSectionMatch = restContent.match(/^\w+:/m);
    const sectionContent = nextSectionMatch 
        ? restContent.slice(0, nextSectionMatch.index) 
        : restContent;
    
    const keyMatch = sectionContent.match(new RegExp(`^\\s*${key}:\\s*"?([^"\\n]+)"?`, 'm'));
    return keyMatch ? keyMatch[1].trim() : "";
}

function extractSenators(content: string): Map<number, { name: string; icon: string }> {
    const senators = new Map<number, { name: string; icon: string }>();
    
    // Find the senators section
    const senatorsStart = content.indexOf('senators:');
    if (senatorsStart === -1) return senators;
    
    const senatorsSection = content.slice(senatorsStart);
    
    // Match each senator entry - more flexible regex
    const seatRegex = /-\s*seat:\s*(\d+)\s*\n\s*name:\s*"?([^"\n]*)"?\s*\n\s*icon:\s*"?([^"\n]*)"?/g;
    
    let match;
    while ((match = seatRegex.exec(senatorsSection)) !== null) {
        const seat = parseInt(match[1]);
        const name = match[2].trim();
        const icon = match[3].trim() || DEFAULT_ICON;
        senators.set(seat, { name, icon });
    }
    
    return senators;
}

function extractCouncillors(content: string): Map<number, { name: string; icon: string }> {
    const councillors = new Map<number, { name: string; icon: string }>();
    
    // Find the councillors section
    const councillorsStart = content.indexOf('councillors:');
    if (councillorsStart === -1) return councillors;
    
    const councillorsSection = content.slice(councillorsStart);
    
    // Match each councillor entry - more flexible regex
    const seatRegex = /-\s*seat:\s*(\d+)\s*\n\s*name:\s*"?([^"\n]*)"?(?:\s*\n\s*icon:\s*"?([^"\n]*)"?)?/g;
    
    let match;
    while ((match = seatRegex.exec(councillorsSection)) !== null) {
        const seat = parseInt(match[1]);
        const name = match[2].trim();
        const icon = match[3]?.trim() || DEFAULT_ICON;
        councillors.set(seat, { name, icon });
    }
    
    return councillors;
}

// Main execution
console.log("=== Officials Sync Script ===\n");
syncGovernmentOfficials();
console.log("");
syncCityOfficials();
console.log("\n=== Sync Complete ===");
