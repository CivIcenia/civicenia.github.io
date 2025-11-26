/**
 * Fix Script: Remove excerpt: null from migrated files
 */

import * as fs from "fs";
import * as path from "path";

const NEWS_DIR = path.join(process.cwd(), "src/content/news");
const CITY_NEWS_DIR = path.join(process.cwd(), "src/content/city-news");

function fixFiles(directory: string, pattern: RegExp) {
    if (!fs.existsSync(directory)) return;
    
    const files = fs.readdirSync(directory).filter(f => pattern.test(f));
    
    for (const file of files) {
        const filePath = path.join(directory, file);
        let content = fs.readFileSync(filePath, "utf-8");
        
        if (content.includes("excerpt: null")) {
            content = content.replace(/excerpt: null\r?\n/g, "");
            fs.writeFileSync(filePath, content);
            console.log(`Fixed: ${file}`);
        }
    }
}

console.log("Fixing news files...");
fixFiles(NEWS_DIR, /election\.md$/);

console.log("Fixing city-news files...");
fixFiles(CITY_NEWS_DIR, /council.*election\.md$/);

console.log("Done!");
