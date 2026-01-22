import { 
    Client, 
    GatewayIntentBits, 
    ForumChannel, 
    ThreadChannel,
    ChannelType 
} from 'discord.js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

dotenv.config();

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
// Republic of Icenia Senate Records Forum
// NOTE: Replace this with the actual Senate forum ID if different
const FORUM_CHANNEL_ID = '1071577869505011822'; 
const NEWS_DIR = path.join(__dirname, 'src', 'content', 'news');
// Cutoff: January 10, 2026
const DATE_CUTOFF = new Date('2026-01-10');

interface LegislationData {
    fullTitle: string;
    link: string;
    content: string;
    threadId: string;
    createdAt: Date;
}

// Month names for formatting
const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

// Get existing thread IDs from news markdown files
function getExistingThreadIds(): Set<string> {
    const existingIds = new Set<string>();
    
    if (!fs.existsSync(NEWS_DIR)) {
        return existingIds;
    }
    
    const files = fs.readdirSync(NEWS_DIR);
    for (const file of files) {
        if (!file.endsWith('.md')) continue;
        
        const filePath = path.join(NEWS_DIR, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Extract thread ID from Discord link at the end of the file
        const linkMatch = content.match(/discord\.com\/channels\/\d+\/(\d+)/);
        if (linkMatch) {
            existingIds.add(linkMatch[1]);
        }
    }
    
    return existingIds;
}

// Generate a slug from the CLEAN headline
function generateSlug(text: string): string {
    return text
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 50);
}

// Helper to format date as YYYY-MM-DD HH:MM:SS +00:00
function formatFullDate(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} +00:00`;
}

// Sanitize content by escaping Discord-style mentions
function sanitizeContent(content: string): string {
    if (!content) return content;
    return content.replace(/<([@#][!&]?\d+)>/g, '&lt;$1&gt;');
}

// Create markdown file for a legislation
function createMarkdownFile(data: LegislationData): void {
    const date = data.createdAt;
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const fullTimestamp = formatFullDate(date);
    const monthYear = `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
    
    // Strip "Res.", "02-08", etc from headline
    const headline = data.fullTitle.replace(/^[^\d]*\d{2}-\d{2}[:\s—-]*\s*/i, '').trim() || data.fullTitle;
    const slug = generateSlug(headline);
    const filename = `${dateStr}-${slug}.md`;
    const filePath = path.join(NEWS_DIR, filename);
    
    if (fs.existsSync(filePath)) {
        console.log(`  Skipping (file exists): ${filename}`);
        return;
    }
    
    const safeContent = sanitizeContent(data.content);

    const markdown = `---
changetolaw: true
layout: "@layouts/news/act.astro"
institution: senate
headline: ${headline}
date: ${fullTimestamp}
document:
  type: markdown
  value: |
AUTOMATICALLY SCRAPED CONTENT:
${safeContent.split('\n').map(line => '    ' + line).join('\n')}
changes: []
icon: /assets/images/law_stock.jpeg
---
[Passed by the ${monthYear} Senate](${data.link})
`;

    fs.writeFileSync(filePath, markdown, 'utf-8');
    console.log(`  Created: ${filename}`);
}

// Update scraped items YAML
function updateScrapedItemsYaml(results: LegislationData[]): void {
    const yamlPath = path.join(__dirname, 'src', 'data', 'scraped-items.yml');
    
    let data: any = { items: [] };
    if (fs.existsSync(yamlPath)) {
        const yamlContent = fs.readFileSync(yamlPath, 'utf-8');
        const loaded = yaml.load(yamlContent) as any;
        if (Array.isArray(loaded)) {
            data.items = loaded;
        } else if (loaded && Array.isArray(loaded.items)) {
            data = loaded;
        }
    }
    
    const existingIds = new Set(data.items.map((item: any) => String(item.id)));
    
    for (const res of results) {
        if (!existingIds.has(res.threadId)) {
            data.items.push({
                id: res.threadId,
                title: res.fullTitle,
                date: res.createdAt.toISOString().substring(0, 10),
                checked: false
            });
        }
    }
    
    const newYamlContent = yaml.dump(data);
    fs.writeFileSync(yamlPath, newYamlContent, 'utf-8');
    console.log(`Updated ${yamlPath} with ${results.length} new items`);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.MessageContent,
    ]
});

client.once('clientReady', async () => {
    console.log(`Logged in as ${client.user?.tag}`);
    try {
        await scrapeForum();
    } catch (error) {
        console.error('Error during scraping:', error);
    }
    await client.destroy();
});

async function scrapeForum() {
    const channel = await client.channels.fetch(FORUM_CHANNEL_ID);

    if (!channel || channel.type !== ChannelType.GuildForum) {
        console.error("The ID provided is not a Forum Channel.");
        return;
    }

    const forumChannel = channel as ForumChannel;
    console.log(`Scanning Senate Forum: ${forumChannel.name}`);
    
    const existingThreadIds = getExistingThreadIds();
    console.log(`Found ${existingThreadIds.size} existing scraped threads`);

    const passedTag = forumChannel.availableTags.find(tag => tag.name.toLowerCase() === "passed");
    if (!passedTag) {
        console.error("No 'Passed' tag found in forum channel.");
        return;
    }
    const passedTagId = passedTag.id;

    const results: LegislationData[] = [];

    // 1. Process Active Threads
    const activeThreads = await forumChannel.threads.fetchActive();
    console.log(`Checking ${activeThreads.threads.size} active threads...`);
    
    for (const thread of activeThreads.threads.values()) {
        await processThread(thread);
    }

    // 2. Process Archived Threads (with pagination to minimize API calls and stop early)
    console.log(`Checking archived threads...`);
    let hasMore = true;
    let lastTimestamp: Date | undefined = undefined;

    while (hasMore) {
        const archived = await forumChannel.threads.fetchArchived({
            limit: 50,
            before: lastTimestamp
        });

        if (archived.threads.size === 0) break;

        for (const thread of archived.threads.values()) {
            const createdAt = thread.createdAt || new Date();
            
            if (createdAt < DATE_CUTOFF) {
                console.log(`Reached threads older than cutoff (${createdAt.toISOString()}). Stopping.`);
                hasMore = false;
                break;
            }

            await processThread(thread);
            lastTimestamp = createdAt;
        }

        if (!archived.hasMore) hasMore = false;
    }

    async function processThread(thread: ThreadChannel) {
        const createdAt = thread.createdAt || new Date();

        // 1. Date cutoff check
        if (createdAt < DATE_CUTOFF) return;

        // 2. Already scraped check
        if (existingThreadIds.has(thread.id)) {
            console.log(`-> Skipping (already scraped): ${thread.name}`);
            return;
        }

        // 3. 'Passed' tag check
        if (!thread.appliedTags?.includes(passedTagId)) {
            console.log(`-> Skipping (not Passed): ${thread.name}`);
            return;
        }

        const title = thread.name;

        let content = "";
        try {
            const starterMsg = await thread.fetchStarterMessage();
            if (starterMsg) {
                content = starterMsg.content;
            } else {
                content = "[No text content found]";
            }
        } catch (e) {
            content = "[Unable to fetch message]";
        }

        results.push({
            fullTitle: title,
            link: `https://discord.com/channels/${thread.guildId}/${thread.id}`,
            content: content,
            threadId: thread.id,
            createdAt: createdAt,
        });
        
        console.log(`-> Processed: ${title}`);
    }

    console.log(`\n\n--- EXTRACTION COMPLETE: Found ${results.length} new matches ---`);
    
    if (!fs.existsSync(NEWS_DIR)) {
        fs.mkdirSync(NEWS_DIR, { recursive: true });
    }

    for (const res of results) {
        createMarkdownFile(res);
    }

    if (results.length > 0) {
        updateScrapedItemsYaml(results);
    }
    
    console.log('\nDone!');
}

client.login(BOT_TOKEN);
