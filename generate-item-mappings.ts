import fs from 'fs';

async function generateMappings() {
    const itemsJson = JSON.parse(fs.readFileSync('items_1.21.8.json', 'utf-8'));
    const mappings: Record<string, string> = {};

    for (const item of itemsJson) {
        const name = item.displayName;
        const id = item.name; // e.g., "raw_gold_block"
        
        // Turn name to lowercase with underscore replacing spaces
        const tradexName = name.toLowerCase().replace(/ /g, '_');
        
        // Map that to the item id if it's not a duplicate
        if (tradexName !== id) {
            mappings[tradexName] = id;
        }
    }

    // Sort mappings for consistency
    const sortedMappings = Object.fromEntries(
        Object.entries(mappings).sort(([a], [b]) => a.localeCompare(b))
    );

    const content = `/**
 * Automatically generated item mappings for ShopExplorer
 * Generated from PrismarineJS minecraft-data 1.21.8
 */
export const ITEM_MAPPINGS: Record<string, string> = ${JSON.stringify(sortedMappings, null, 4)};
`;

    fs.writeFileSync('src/data/item-mappings.ts', content);
    console.log(`Generated ${Object.keys(mappings).length} mappings to src/data/item-mappings.ts`);
}

generateMappings().catch(console.error);
