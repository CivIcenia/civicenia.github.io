#!/usr/bin/env bun
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

const YAML_PATH = path.join(__dirname, '..', 'src', 'data', 'city-scraped-items.yml');

interface ScrapedItem {
    id: string;
    title: string;
    date: string;
    checked: boolean;
}

function cleanScrapedItems() {
    if (!fs.existsSync(YAML_PATH)) {
        console.log('No scraped items file found');
        return;
    }

    const content = fs.readFileSync(YAML_PATH, 'utf-8');
    const data = yaml.load(content) as any;
    const items: ScrapedItem[] = (data?.items || data) as ScrapedItem[];

    if (!Array.isArray(items)) {
        console.log('No items array found in YAML');
        return;
    }

    const originalCount = items.length;
    const cleanedItems = items.filter(item => !item.checked);
    const removedCount = originalCount - cleanedItems.length;

    if (removedCount === 0) {
        console.log('No checked items to remove');
        return;
    }

    const newContent = yaml.dump(data.items ? { items: cleanedItems } : cleanedItems);
    fs.writeFileSync(YAML_PATH, newContent, 'utf-8');

    console.log(`Removed ${removedCount} reviewed items. ${cleanedItems.length} items remaining.`);
}

cleanScrapedItems();
