import { readdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

const NEWS_DIR = "src/content/news";
const CITY_NEWS_DIR = "src/content/city-news";

async function extractTermFromContent(content: string): Promise<number | null> {
    // Match patterns like "This was Term 2 of the Senate" or "This was Term 15 of the Council"
    const termMatch = content.match(/This was Term (\d+) of the (Senate|Council)/i);
    if (termMatch) {
        return parseInt(termMatch[1], 10);
    }
    return null;
}

async function addTermToFrontmatter(filePath: string): Promise<{ file: string; term: number | null; updated: boolean }> {
    const content = await readFile(filePath, "utf-8");
    
    // Check if it's an official change file
    const isOfficialChange = content.includes("officialchange: true") || content.includes("cityofficialchange: true");
    if (!isOfficialChange) {
        return { file: filePath, term: null, updated: false };
    }
    
    // Check if term already exists in frontmatter
    if (content.match(/^term:\s*\d+/m)) {
        const existingTerm = content.match(/^term:\s*(\d+)/m);
        return { file: filePath, term: existingTerm ? parseInt(existingTerm[1], 10) : null, updated: false };
    }
    
    // Extract term from content
    const term = await extractTermFromContent(content);
    if (!term) {
        return { file: filePath, term: null, updated: false };
    }
    
    // Add term to frontmatter after changetype line
    const updatedContent = content.replace(
        /^(changetype:\s*.+)$/m,
        `$1\nterm: ${term}`
    );
    
    if (updatedContent === content) {
        console.log(`  Warning: Could not find changetype in ${filePath}`);
        return { file: filePath, term, updated: false };
    }
    
    await writeFile(filePath, updatedContent, "utf-8");
    return { file: filePath, term, updated: true };
}

async function processDirectory(dir: string, label: string): Promise<void> {
    console.log(`\n=== Processing ${label} ===\n`);
    
    const files = await readdir(dir);
    const mdFiles = files.filter(f => f.endsWith(".md"));
    
    let updated = 0;
    let skipped = 0;
    let noTerm = 0;
    
    for (const file of mdFiles) {
        const filePath = join(dir, file);
        const result = await addTermToFrontmatter(filePath);
        
        if (result.updated) {
            console.log(`✓ ${file} - Added term: ${result.term}`);
            updated++;
        } else if (result.term !== null) {
            console.log(`- ${file} - Already has term: ${result.term}`);
            skipped++;
        } else {
            // Only log if it's an election file without a term
            const content = await readFile(filePath, "utf-8");
            if (content.includes("officialchange: true") || content.includes("cityofficialchange: true")) {
                console.log(`? ${file} - No term found in content`);
                noTerm++;
            }
        }
    }
    
    console.log(`\n${label} Summary:`);
    console.log(`  Updated: ${updated}`);
    console.log(`  Already had term: ${skipped}`);
    console.log(`  No term in content: ${noTerm}`);
}

async function main(): Promise<void> {
    console.log("=== Term Migration Script ===");
    console.log("Extracting term numbers from content and adding to frontmatter...\n");
    
    await processDirectory(NEWS_DIR, "Government Official Changes");
    await processDirectory(CITY_NEWS_DIR, "City Official Changes");
    
    console.log("\n=== Migration Complete ===");
}

main().catch(console.error);
