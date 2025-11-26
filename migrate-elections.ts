/**
 * Migration Script: Elections to Official Changes
 * 
 * This script converts old election posts (election: true) to the new
 * Government Official Changes format (officialchange: true), and
 * Council Elections to City Official Changes.
 * 
 * Usage: bun run migrate-elections.ts [--dry-run]
 * 
 * --dry-run: Only show what would be changed without making modifications
 */

import * as fs from "fs";
import * as path from "path";
import matter from "gray-matter";

const NEWS_DIR = path.join(process.cwd(), "src/content/news");
const CITY_NEWS_DIR = path.join(process.cwd(), "src/content/city-news");
const BACKUP_DIR = path.join(process.cwd(), "migration-backup");

const DRY_RUN = process.argv.includes("--dry-run");

interface ElectionData {
    election: boolean;
    layout: string;
    headline: string;
    term: number;
    date: string | Date;
    parties: Array<{
        name: string;
        bgcolour: string;
        txtcolour: string;
        members: string[];
        exmembers: string[];
    }>;
    icon: string;
}

interface CouncilElectionData {
    councilelection: boolean;
    layout: string;
    headline: string;
    term: number;
    date: string | Date;
    councillors: Array<{
        name: string;
        role?: string;
    }>;
    icon: string;
}

interface OfficialEntry {
    name: string;
    role: string;
    action: "elected" | "reelected" | "appointed";
    seat?: number;
}

function ensureBackupDir() {
    if (!DRY_RUN && !fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
        fs.mkdirSync(path.join(BACKUP_DIR, "news"), { recursive: true });
        fs.mkdirSync(path.join(BACKUP_DIR, "city-news"), { recursive: true });
    }
}

function backupFile(filePath: string, type: "news" | "city-news") {
    if (DRY_RUN) return;
    const fileName = path.basename(filePath);
    const backupPath = path.join(BACKUP_DIR, type, fileName);
    fs.copyFileSync(filePath, backupPath);
    console.log(`  Backed up to: ${backupPath}`);
}

/**
 * Extract term label from headline (e.g., "March Senate (2025)" -> "March 2025")
 */
function extractTermLabel(headline: string): string {
    // Match patterns like "March Senate (2025)" or "November 2025 Senate Election"
    const match1 = headline.match(/^(\w+)\s+Senate\s*\((\d{4})\)/i);
    if (match1) {
        return `${match1[1]} ${match1[2]}`;
    }
    
    const match2 = headline.match(/^(\w+)\s+(\d{4})/);
    if (match2) {
        return `${match2[1]} ${match2[2]}`;
    }
    
    return headline;
}

/**
 * Convert election parties/members to officials array with seat assignments
 */
function convertPartiesToOfficials(parties: ElectionData["parties"], term: number): OfficialEntry[] {
    const officials: OfficialEntry[] = [];
    let seatNumber = 1;
    
    // Collect all elected members
    for (const party of parties) {
        for (const member of party.members || []) {
            officials.push({
                name: member,
                role: "senator",
                action: "elected",
                seat: seatNumber++
            });
        }
    }
    
    return officials;
}

/**
 * Convert council election councillors to officials array
 */
function convertCouncillorsToOfficials(councillors: CouncilElectionData["councillors"]): OfficialEntry[] {
    const officials: OfficialEntry[] = [];
    let seatNumber = 1;
    
    for (const councillor of councillors || []) {
        if (councillor.role === "Mayor") {
            officials.push({
                name: councillor.name,
                role: "mayor",
                action: "elected"
            });
        } else {
            officials.push({
                name: councillor.name,
                role: "councillor",
                action: "elected",
                seat: seatNumber++
            });
        }
    }
    
    return officials;
}

/**
 * Generate new headline for official change
 */
function generateOfficialChangeHeadline(oldHeadline: string): string {
    // "March Senate (2025)" -> "March 2025 Senate Election"
    const match = oldHeadline.match(/^(\w+)\s+Senate\s*\((\d{4})\)/i);
    if (match) {
        return `${match[1]} ${match[2]} Senate Election`;
    }
    
    // Already in good format or other format
    if (oldHeadline.toLowerCase().includes("election")) {
        return oldHeadline;
    }
    
    return `${oldHeadline} Election`;
}

/**
 * Generate new filename from headline
 */
function generateFilename(date: Date, headline: string): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    
    // Slugify headline
    const slug = headline
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim();
    
    return `${year}-${month}-${day}-${slug}.md`;
}

/**
 * Migrate senate elections to official changes
 */
function migrateSenateElections() {
    console.log("\n=== Migrating Senate Elections ===\n");
    
    if (!fs.existsSync(NEWS_DIR)) {
        console.log("News directory not found!");
        return;
    }
    
    const files = fs.readdirSync(NEWS_DIR).filter(f => f.endsWith(".md"));
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const file of files) {
        const filePath = path.join(NEWS_DIR, file);
        const content = fs.readFileSync(filePath, "utf-8");
        const { data, content: body } = matter(content);
        
        // Skip if not an election
        if (data.election !== true) continue;
        
        console.log(`Processing: ${file}`);
        
        const election = data as ElectionData;
        
        // Convert to official change format
        const officials = convertPartiesToOfficials(election.parties, election.term);
        const newHeadline = generateOfficialChangeHeadline(election.headline);
        
        const newFrontmatter = {
            officialchange: true,
            layout: "@layouts/news/official-change.astro",
            changetype: "senate-election",
            headline: newHeadline,
            date: election.date,
            officials: officials,
            icon: election.icon || "/assets/images/election_stock.png"
        };
        
        // Generate body content with election results preserved
        let newBody = body.trim();
        if (newBody.length === 0) {
            // Generate summary from party data
            newBody = `## Election Results\n\n`;
            for (const party of election.parties) {
                if (party.members && party.members.length > 0) {
                    newBody += `### ${party.name}\n`;
                    for (const member of party.members) {
                        newBody += `- ${member}\n`;
                    }
                    if (party.exmembers && party.exmembers.length > 0) {
                        newBody += `\nResigned/Defected:\n`;
                        for (const exmember of party.exmembers) {
                            newBody += `- ~~${exmember}~~\n`;
                        }
                    }
                    newBody += "\n";
                }
            }
        }
        
        // Add term info to body
        const termInfo = `\n\n---\n*This was Term ${election.term} of the Senate.*\n`;
        newBody += termInfo;
        
        // Preserve original party information for historical reference
        const partyInfo = `\n\n<details>\n<summary>Original Party Data</summary>\n\n`;
        let partyDetails = "";
        for (const party of election.parties) {
            partyDetails += `**${party.name}** (${party.bgcolour})\n`;
            partyDetails += `Members: ${(party.members || []).join(", ") || "None"}\n`;
            if (party.exmembers && party.exmembers.length > 0) {
                partyDetails += `Former: ${party.exmembers.join(", ")}\n`;
            }
            partyDetails += "\n";
        }
        newBody += partyInfo + partyDetails + "</details>\n";
        
        // Generate new content
        const newContent = matter.stringify(newBody, newFrontmatter);
        
        // Determine new filename
        const date = new Date(election.date);
        const newFilename = generateFilename(date, newHeadline);
        const newFilePath = path.join(NEWS_DIR, newFilename);
        
        if (DRY_RUN) {
            console.log(`  Would convert to: ${newFilename}`);
            console.log(`  Officials: ${officials.map(o => `${o.name} (Seat ${o.seat})`).join(", ")}`);
        } else {
            // Backup original file
            backupFile(filePath, "news");
            
            // Remove old file
            fs.unlinkSync(filePath);
            
            // Write new file
            fs.writeFileSync(newFilePath, newContent);
            console.log(`  Migrated to: ${newFilename}`);
        }
        
        migratedCount++;
    }
    
    console.log(`\nSenate Elections: ${migratedCount} migrated, ${skippedCount} skipped`);
}

/**
 * Migrate council elections to city official changes
 */
function migrateCouncilElections() {
    console.log("\n=== Migrating Council Elections ===\n");
    
    if (!fs.existsSync(CITY_NEWS_DIR)) {
        console.log("City news directory not found!");
        return;
    }
    
    const files = fs.readdirSync(CITY_NEWS_DIR).filter(f => f.endsWith(".md"));
    let migratedCount = 0;
    
    for (const file of files) {
        const filePath = path.join(CITY_NEWS_DIR, file);
        const content = fs.readFileSync(filePath, "utf-8");
        const { data, content: body } = matter(content);
        
        // Skip if not a council election
        if (data.councilelection !== true) continue;
        
        console.log(`Processing: ${file}`);
        
        const election = data as CouncilElectionData;
        
        // Convert to city official change format
        const officials = convertCouncillorsToOfficials(election.councillors);
        
        // Generate new headline
        const newHeadline = election.headline.includes("Election") 
            ? election.headline 
            : `${election.headline} Council Election`;
        
        const newFrontmatter = {
            cityofficialchange: true,
            layout: "@layouts/news/city-official-change.astro",
            changetype: "council-election",
            headline: newHeadline,
            date: election.date,
            officials: officials,
            icon: election.icon || "/assets/images/election_stock.png"
        };
        
        // Preserve body content
        let newBody = body.trim();
        if (newBody.length === 0) {
            newBody = `## Council Election Results\n\n`;
            for (const official of officials) {
                const roleLabel = official.role === "mayor" ? " (Mayor)" : "";
                newBody += `- ${official.name}${roleLabel}\n`;
            }
        }
        
        // Add term info
        newBody += `\n\n---\n*This was Term ${election.term} of the City Council.*\n`;
        
        // Generate new content
        const newContent = matter.stringify(newBody, newFrontmatter);
        
        // Determine new filename
        const date = new Date(election.date);
        const newFilename = generateFilename(date, newHeadline);
        const newFilePath = path.join(CITY_NEWS_DIR, newFilename);
        
        if (DRY_RUN) {
            console.log(`  Would convert to: ${newFilename}`);
            console.log(`  Officials: ${officials.map(o => `${o.name} (${o.role}${o.seat ? `, Seat ${o.seat}` : ""})`).join(", ")}`);
        } else {
            // Backup original file
            backupFile(filePath, "city-news");
            
            // Remove old file
            fs.unlinkSync(filePath);
            
            // Write new file
            fs.writeFileSync(newFilePath, newContent);
            console.log(`  Migrated to: ${newFilename}`);
        }
        
        migratedCount++;
    }
    
    console.log(`\nCouncil Elections: ${migratedCount} migrated`);
}

// Main execution
console.log("====================================");
console.log("  Election Migration Script");
console.log("====================================");
if (DRY_RUN) {
    console.log("\n⚠️  DRY RUN MODE - No files will be modified\n");
}

ensureBackupDir();
migrateSenateElections();
migrateCouncilElections();

console.log("\n====================================");
if (DRY_RUN) {
    console.log("Dry run complete. Run without --dry-run to apply changes.");
} else {
    console.log("Migration complete!");
    console.log(`Backups stored in: ${BACKUP_DIR}`);
}
console.log("====================================\n");
