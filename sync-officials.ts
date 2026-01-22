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
const ROLE_CONFIG_FILE = path.join(process.cwd(), "src/data/role-config.yml");
const CMS_CONFIG_FILE = path.join(process.cwd(), "public/admin/config.yml");

const DEFAULT_ICON = "https://cdn.discordapp.com/embed/avatars/0.png";

interface OfficialEntry {
    name: string;
    role: string;
    action: string;
    icon?: string;
    discord_id?: string;
    seat?: number;
}

interface ChangePost {
    date: Date;
    changetype: string;
    officials: OfficialEntry[];
    headline: string;
    senate_size?: number;
}

interface RoleDefinition {
    id: string;
    display_name: string;
    multi_seat: boolean;
    num_seats?: number;
    order: number;
}

interface RoleConfig {
    republic_roles: RoleDefinition[];
    city_roles: RoleDefinition[];
}

// Load role configuration
function loadRoleConfig(): RoleConfig {
    try {
        const content = fs.readFileSync(ROLE_CONFIG_FILE, "utf-8");
        // Parse YAML using gray-matter (which we already have as a dependency)
        const parsed = matter(`---\n${content}\n---`);
        const config = parsed.data as RoleConfig;
        return config;
    } catch (error) {
        console.error("Error loading role config, using defaults:", error);
        return {
            republic_roles: [
                { id: "president", display_name: "President", multi_seat: false, order: 1 },
                { id: "secretary_of_defense", display_name: "Secretary of Defense", multi_seat: false, order: 2 },
                { id: "secretary_of_interior", display_name: "Secretary of the Interior", multi_seat: false, order: 3 },
                { id: "secretary_of_treasury", display_name: "Secretary of Treasury", multi_seat: false, order: 4 },
                { id: "speaker", display_name: "Speaker of the Senate", multi_seat: false, order: 5 },
                { id: "senator", display_name: "Senator", multi_seat: true, num_seats: 5, order: 6 },
            ],
            city_roles: [
                { id: "mayor", display_name: "Mayor", multi_seat: false, order: 1 },
                { id: "councillor", display_name: "Councillor", multi_seat: true, num_seats: 5, order: 2 },
            ]
        };
    }
}

// Helper function to convert snake_case to kebab-case
function toKebabCase(snakeCase: string): string {
    return snakeCase.replace(/_/g, '-');
}

// Helper function to build role mappings from role config
function buildRoleMappings(roles: RoleDefinition[]): Record<string, string> {
    const mappings: Record<string, string> = {};
    for (const role of roles) {
        const kebabCase = toKebabCase(role.id);
        mappings[kebabCase] = role.id;
    }
    return mappings;
}

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

    // Load role configuration
    const roleConfig = loadRoleConfig();
    const republicRoles = roleConfig.republic_roles;
    
    // Build role mappings automatically from config
    const GOV_ROLE_MAP = buildRoleMappings(republicRoles);

    // Read current officials file
    const currentContent = fs.readFileSync(OFFICIALS_FILE, "utf-8");
    
    // Get current senators early for reference when processing changes
    const currentSenators = extractSenators(currentContent);
    
    // Extract existing discord_ids and icons for all roles from current file
    const existingRoleData: Record<string, { icon: string; discord_id?: string }> = {};
    for (const role of republicRoles.filter(r => !r.multi_seat)) {
        existingRoleData[role.id] = {
            icon: extractValue(currentContent, role.id, 'icon') || DEFAULT_ICON,
            discord_id: extractValue(currentContent, role.id, 'discord_id')
        };
    }
    
    // Track the latest official for each role/seat
    const latestOfficials: Record<string, { name: string; icon: string; discord_id?: string; seat?: number }> = {};
    const latestSenators: Map<number, { name: string; icon: string; discord_id?: string }> = new Map();
    let latestSenateTerm = "";
    
    // Get number of senate seats from role config
    const senatorRole = republicRoles.find(r => r.id === "senator");
    let latestSenateSize = senatorRole?.num_seats || 7;

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
                    // Get existing data to preserve icon if not provided
                    const existing = currentSenators?.get(official.seat);
                    latestSenators.set(official.seat, {
                        name: official.name,
                        icon: official.icon || existing?.icon || DEFAULT_ICON,
                        discord_id: official.discord_id || existing?.discord_id
                    });
                } else {
                    console.warn(`  - Senator "${official.name}" has no seat number, skipping update`);
                }
            } else {
                // Get existing data from file, then check if we've already processed this role
                const fileData = existingRoleData[yamlRole] || { icon: DEFAULT_ICON };
                const existing = latestOfficials[yamlRole] || fileData;
                latestOfficials[yamlRole] = {
                    name: official.name,
                    icon: official.icon || existing.icon || DEFAULT_ICON,
                    discord_id: official.discord_id || existing.discord_id
                };
            }
        }
    }

    // Build YAML dynamically based on role config
    let newContent = `# Government Officials Data
# This file is managed through Decap CMS and synced from Official Change posts
# Use https://toolscord.com/ to get Discord profile pictures

# Senate term label (e.g., "September 2025")
senate_term: "${latestSenateTerm || extractCurrentTerm(currentContent)}"

`;

    // Add single-seat roles - ensure ALL roles from config are included
    for (const role of republicRoles.filter(r => !r.multi_seat)) {
        const official = latestOfficials[role.id] || { 
            name: extractValue(currentContent, role.id, 'name'), 
            icon: existingRoleData[role.id]?.icon || DEFAULT_ICON,
            discord_id: existingRoleData[role.id]?.discord_id
        };
        newContent += `# ${role.display_name}
${role.id}:
  name: "${official.name || ''}"
  icon: "${official.icon || DEFAULT_ICON}"
`;
        if (official.discord_id) {
            newContent += `  discord_id: "${official.discord_id}"
`;
        }
        newContent += `
`;
    }

    // Add multi-seat roles (senators)
    newContent += `# Senate Seats - ${latestSenateSize} seats
senators:
`;
    for (let seat = 1; seat <= latestSenateSize; seat++) {
        const senator = latestSenators.get(seat) || currentSenators.get(seat) || { name: "", icon: DEFAULT_ICON };
        newContent += `  - seat: ${seat}
    name: "${senator.name}"
    icon: "${senator.icon}"
`;
        if (senator.discord_id) {
            newContent += `    discord_id: "${senator.discord_id}"
`;
        }
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

    // Load role configuration
    const roleConfig = loadRoleConfig();
    const cityRoles = roleConfig.city_roles;
    
    // Build role mappings automatically from config
    const CITY_ROLE_MAP = buildRoleMappings(cityRoles);

    // Read current councillors file
    const currentContent = fs.readFileSync(COUNCILLORS_FILE, "utf-8");
    
    // Get current councillors early for reference when processing changes
    const currentCouncillors = extractCouncillors(currentContent);
    
    // Extract existing discord_ids and icons for all roles from current file
    const existingRoleData: Record<string, { icon: string; discord_id?: string }> = {};
    for (const role of cityRoles.filter(r => !r.multi_seat)) {
        existingRoleData[role.id] = {
            icon: extractValue(currentContent, role.id, 'icon') || DEFAULT_ICON,
            discord_id: extractValue(currentContent, role.id, 'discord_id')
        };
    }
    
    // Track the latest official for each role/seat
    const latestOfficials: Record<string, { name: string; icon: string; discord_id?: string }> = {};
    const latestCouncillors: Map<number, { name: string; icon: string; discord_id?: string }> = new Map();
    let latestCouncilTerm = "";
    
    // Get number of councillor seats from role config
    const councillorRole = cityRoles.find(r => r.id === "councillor");
    const councillorSeats = councillorRole?.num_seats || 5;

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
                // Get existing data to preserve icon if not provided
                const existing = currentCouncillors?.get(official.seat);
                latestCouncillors.set(official.seat, {
                    name: official.name,
                    icon: official.icon || existing?.icon || DEFAULT_ICON,
                    discord_id: official.discord_id || existing?.discord_id
                });
            } else {
                // Get existing data from file, then check if we've already processed this role
                const fileData = existingRoleData[yamlRole] || { icon: DEFAULT_ICON };
                const existing = latestOfficials[yamlRole] || fileData;
                latestOfficials[yamlRole] = {
                    name: official.name,
                    icon: official.icon || existing.icon || DEFAULT_ICON,
                    discord_id: official.discord_id || existing.discord_id
                };
            }
        }
    }

    // Build YAML dynamically based on role config
    let newContent = `# City Councillors Data
# This file is managed through Decap CMS and synced from City Official Change posts
# Use https://toolscord.com/ to get Discord profile pictures

council_term: "${latestCouncilTerm || extractSimpleValue(currentContent, 'council_term')}"

`;

    // Add single-seat roles - ensure ALL roles from config are included
    for (const role of cityRoles.filter(r => !r.multi_seat)) {
        const official = latestOfficials[role.id] || { 
            name: extractValue(currentContent, role.id, 'name'), 
            icon: existingRoleData[role.id]?.icon || DEFAULT_ICON,
            discord_id: existingRoleData[role.id]?.discord_id
        };
        newContent += `# ${role.display_name}
${role.id}:
  name: "${official.name || ''}"
  icon: "${official.icon || DEFAULT_ICON}"
`;
        if (official.discord_id) {
            newContent += `  discord_id: "${official.discord_id}"
`;
        }
        newContent += `
`;
    }

    // Add multi-seat roles (councillors)
    newContent += `# Councillor Seats - ${councillorSeats} seats
councillors:
`;
    for (let seat = 1; seat <= councillorSeats; seat++) {
        const councillor = latestCouncillors.get(seat) || currentCouncillors.get(seat) || { name: "", icon: DEFAULT_ICON };
        newContent += `  - seat: ${seat}
    name: "${councillor.name}"
    icon: "${councillor.icon}"
`;
        if (councillor.discord_id) {
            newContent += `    discord_id: "${councillor.discord_id}"
`;
        }
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

function extractSenators(content: string): Map<number, { name: string; icon: string; discord_id?: string }> {
    const senators = new Map<number, { name: string; icon: string; discord_id?: string }>();
    
    // Find the senators section
    const senatorsStart = content.indexOf('senators:');
    if (senatorsStart === -1) return senators;
    
    const senatorsSection = content.slice(senatorsStart);
    
    // Match each senator entry - more flexible regex
    const seatRegex = /-\s*seat:\s*(\d+)\s*\n\s*name:\s*"?([^"\n]*)"?\s*\n\s*icon:\s*"?([^"\n]*)"?(?:\s*\n\s*discord_id:\s*"?([^"\n]*)"?)?/g;
    
    let match: RegExpExecArray | null;
    while ((match = seatRegex.exec(senatorsSection)) !== null) {
        const seat = parseInt(match[1]);
        const name = match[2].trim();
        const icon = match[3].trim() || DEFAULT_ICON;
        const discord_id = match[4]?.trim();
        senators.set(seat, { name, icon, discord_id });
    }
    
    return senators;
}

function extractCouncillors(content: string): Map<number, { name: string; icon: string; discord_id?: string }> {
    const councillors = new Map<number, { name: string; icon: string; discord_id?: string }>();
    
    // Find the councillors section
    const councillorsStart = content.indexOf('councillors:');
    if (councillorsStart === -1) return councillors;
    
    const councillorsSection = content.slice(councillorsStart);
    
    // Match each councillor entry - more flexible regex
    const seatRegex = /-\s*seat:\s*(\d+)\s*\n\s*name:\s*"?([^"\n]*)"?(?:\s*\n\s*icon:\s*"?([^"\n]*)"?)?(?:\s*\n\s*discord_id:\s*"?([^"\n]*)"?)?/g;
    
    let match: RegExpExecArray | null;
    while ((match = seatRegex.exec(councillorsSection)) !== null) {
        const seat = parseInt(match[1]);
        const name = match[2].trim();
        const icon = match[3]?.trim() || DEFAULT_ICON;
        const discord_id = match[4]?.trim();
        councillors.set(seat, { name, icon, discord_id });
    }
    
    return councillors;
}

function syncCMSConfig() {
    console.log("Syncing CMS config with role definitions...");
    
    const roleConfig = loadRoleConfig();
    const cmsContent = fs.readFileSync(CMS_CONFIG_FILE, "utf-8");
    
    // Generate role options for government officials
    const govRoleOptions = roleConfig.republic_roles
        .map(role => `              - {label: "${role.display_name}", value: "${toKebabCase(role.id)}"}`)
        .join('\n');
    
    // Generate role options for city officials
    const cityRoleOptions = roleConfig.city_roles
        .map(role => `              - {label: "${role.display_name}", value: "${toKebabCase(role.id)}"}`)
        .join('\n');
    
    // Replace government official role options
    let updatedContent = cmsContent.replace(
        /(\s+- label: "Role"\s+name: "role"\s+widget: "select"\s+required: true\s+options:\s*\n)(?:\s+- \{label: "[^"]+", value: "[^"]+"\}\s*\n)+(\s+- label: "Action")/g,
        (match, before, after) => {
            // Check if this is in the officialchanges section (government)
            const beforeMatch = cmsContent.substring(0, cmsContent.indexOf(match));
            if (beforeMatch.includes('name: "officialchanges"') && !beforeMatch.includes('name: "cityofficialchanges"')) {
                return `${before}${govRoleOptions}\n${after}`;
            }
            return match;
        }
    );
    
    // Replace city official role options
    updatedContent = updatedContent.replace(
        /(\s+- label: "Role"\s+name: "role"\s+widget: "select"\s+required: true\s+options:\s*\n)(?:\s+- \{label: "[^"]+", value: "[^"]+"\}\s*\n)+(\s+- label: "Action")/g,
        (match, before, after) => {
            // Check if this is in the cityofficialchanges section
            const beforeMatch = updatedContent.substring(0, updatedContent.indexOf(match));
            const lastOfficialChanges = beforeMatch.lastIndexOf('name: "officialchanges"');
            const lastCityOfficialChanges = beforeMatch.lastIndexOf('name: "cityofficialchanges"');
            
            if (lastCityOfficialChanges > lastOfficialChanges) {
                return `${before}${cityRoleOptions}\n${after}`;
            }
            return match;
        }
    );
    
    if (updatedContent !== cmsContent) {
        fs.writeFileSync(CMS_CONFIG_FILE, updatedContent);
        console.log("CMS config updated with role definitions!");
    } else {
        console.log("CMS config already up to date.");
    }
}

// Main execution
console.log("=== Officials Sync Script ===\n");
syncGovernmentOfficials();
console.log("");
syncCityOfficials();
console.log("");
syncCMSConfig();
console.log("\n=== Sync Complete ===");
