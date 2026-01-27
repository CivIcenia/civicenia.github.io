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
// Icenia City Council Records Forum
const FORUM_CHANNEL_ID = '1432219989183823902';
const CITY_NEWS_DIR = path.join(__dirname, 'src', 'content', 'city-news');
const STATUS_FILE = path.join(__dirname, 'src', 'data', 'scraper-status.yml');

interface LegislationData {
    fullTitle: string;
    term: number;
    legislation: number;
    link: string;
    content: string;
    threadId: string;
    createdAt: Date;
    sponsorUsername: string;
}

// Month names for formatting
const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

// Get existing thread IDs from city-news markdown files
function getExistingThreadIds(): Set<string> {
    const existingIds = new Set<string>();
    
    if (!fs.existsSync(CITY_NEWS_DIR)) {
        return existingIds;
    }
    
    const files = fs.readdirSync(CITY_NEWS_DIR);
    for (const file of files) {
        if (!file.endsWith('.md')) continue;
        
        const filePath = path.join(CITY_NEWS_DIR, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // 1. Try to extract from frontmatter discord_thread_id
        const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
        if (frontmatterMatch) {
            try {
                const yamlData = yaml.load(frontmatterMatch[1]) as any;
                if (yamlData && yamlData.discord_thread_id) {
                    existingIds.add(String(yamlData.discord_thread_id));
                    continue;
                }
            } catch (e) {
                // Fallback to regex if YAML parsing fails
            }
        }

        // 2. Fallback: Extract thread ID from Discord link
        const linkMatch = content.match(/discord\.com\/channels\/\d+\/(\d+)/);
        if (linkMatch) {
            existingIds.add(linkMatch[1]);
        }
    }
    
    return existingIds;
}

// Generate a slug from the CLEAN headline (not the raw title)
function generateSlug(text: string): string {
    return text
        .trim()
        .toLowerCase()
        // Remove non-alphanumeric chars (except spaces and dashes)
        .replace(/[^a-z0-9\s-]/g, '')
        // Replace spaces with dashes
        .replace(/\s+/g, '-')
        // Remove duplicate dashes
        .replace(/-+/g, '-')
        // Limit length
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

 // Sanitize content by escaping Discord-style mentions like <@&123456>
function sanitizeContent(content: string): string {
    if (!content) return content;
    // Escape Discord mention tags so MDX/HTML parsers don't treat them as tags.
    // Matches: <@123>, <@!123>, <@&123>, <#123>
    return content.replace(/<([@#][!&]?\d+)>/g, '<$1>');
}

// Format a headline into Title Case while keeping small words lowercase (unless first word).
function formatHeadline(text: string): string {
    if (!text) return text;
    const smallWords = new Set([
        'a','an','the','and','but','or','for','nor','on','at','to','from','by','of','in','into','with','over','per'
    ]);
    // Normalize whitespace and lowercase everything first
    const tokens = text.trim().toLowerCase().split(/\s+/);
    const titled = tokens.map((w, i) => {
        if (i !== 0 && smallWords.has(w)) return w;
        return w.charAt(0).toUpperCase() + w.slice(1);
    });
    return titled.join(' ');
}

// Create markdown file for a legislation
function createMarkdownFile(data: LegislationData): void {
    const date = data.createdAt;
    
    // File name date (YYYY-MM-DD)
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    // Full timestamp for frontmatter
    const fullTimestamp = formatFullDate(date);
    const monthYear = `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
    
    // 1. Generate the headline first (Strip "Ord.", "02-08", etc)
    // Regex explanation:
    // ^[^\d]*      -> Start with anything that isn't a digit (e.g. "Ord. ", "Res ")
    // \d{2}-\d{2}  -> The specific number pattern (e.g. "02-08")
    // [:\s—-]*\s*  -> Any separators (colon, dash, em-dash) and whitespace following it
    const rawHeadline = data.fullTitle.replace(/^[^\d]*\d{2}-\d{2}[:\s—-]*\s*/i, '').trim() || data.fullTitle;
    const headline = formatHeadline(rawHeadline);

    // 2. Generate slug ONLY from the clean headline
    // Example: "Subway Surfers Act" -> "subway-surfers-act"
    const slug = generateSlug(headline);
    
    const filename = `${dateStr}-${slug}.md`;
    const filePath = path.join(CITY_NEWS_DIR, filename);
    
    // Skip if file already exists
    if (fs.existsSync(filePath)) {
        console.log(`  Skipping (file exists): ${filename}`);
        return;
    }
    
        // Sanitize content so embedded Discord mention tags don't break MD/MDX parsers
        const safeContent = sanitizeContent(data.content);

    const markdown = `---
changetocitylaw: true
layout: "@layouts/news/city-act.astro"
institution: council
term_number: ${data.term}
act_number: ${data.legislation}
headline: Passing the ${headline}
date: ${fullTimestamp}
discord_thread_id: ${data.threadId}
excerpt: Sponsored by ${data.sponsorUsername}
document:
  type: markdown
  value: |
    AUTOMATICALLY SCRAPED CONTENT:

${safeContent.split('\n').map(line => '    ' + line).join('\n')}
changes: []
icon: /assets/images/law_stock.jpeg
---
[Passed by the Term ${data.term} City Council](${data.link})
`;

    fs.writeFileSync(filePath, markdown, 'utf-8');
    console.log(`  Created: ${filename}`);
}

// Update scraped items YAML and status
function updateScrapedItemsYaml(results: LegislationData[], runStartTime: Date): void {
    const yamlPath = path.join(__dirname, 'src', 'data', 'city-scraped-items.yml');
    
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
    
    const existingIds = new Set(data.items.map((item: any) => item.id));
    
    for (const res of results) {
        if (!existingIds.has(res.threadId)) {
            data.items.push({
                id: res.threadId,
                title: res.fullTitle,
                date: res.createdAt.toISOString().substring(0, 10), // YYYY-MM-DD format
                checked: false
            });
        }
    }
    
    const newYamlContent = yaml.dump(data);
    fs.writeFileSync(yamlPath, newYamlContent, 'utf-8');
    console.log(`Updated ${yamlPath} with ${results.length} new items`);

    // Update status file
    let status: any = {};
    if (fs.existsSync(STATUS_FILE)) {
        status = yaml.load(fs.readFileSync(STATUS_FILE, 'utf-8')) || {};
    }
    status.council_last_scraped_at = runStartTime.toISOString();
    fs.writeFileSync(STATUS_FILE, yaml.dump(status), 'utf-8');
    console.log(`Updated ${STATUS_FILE} with new council_last_scraped_at: ${status.council_last_scraped_at}`);
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
    const runStartTime = new Date();
    const channel = await client.channels.fetch(FORUM_CHANNEL_ID);

    if (!channel || channel.type !== ChannelType.GuildForum) {
        console.error("The ID provided is not a Forum Channel.");
        return;
    }

    const forumChannel = channel as ForumChannel;
    console.log(`Scanning Council Forum: ${forumChannel.name}`);
    
    // Load last scraped date from status file
    let dateCutoff = new Date('2024-01-10');
    if (fs.existsSync(STATUS_FILE)) {
        const status = yaml.load(fs.readFileSync(STATUS_FILE, 'utf-8')) as any;
        if (status?.council_last_scraped_at) {
            dateCutoff = new Date(status.council_last_scraped_at);
        }
    }
    console.log(`--------------------------------------------------`);
    console.log(`CUTOFF DATE: ${dateCutoff.toISOString()}`);
    console.log(`(Threads archived or created before this will be skipped)`);
    console.log(`--------------------------------------------------\n`);

    const existingThreadIds = getExistingThreadIds();
    console.log(`Found ${existingThreadIds.size} existing scraped threads`);

    // Find the tag ID for "Passed"
    const passedTag = forumChannel.availableTags.find(tag => tag.name.toLowerCase() === "passed");
    if (!passedTag) {
        console.error("No 'Passed' tag found in forum channel.");
        return;
    }
    const passedTagId = passedTag.id;

    const results: LegislationData[] = [];
    const processedIds = new Set<string>();
    // Regex to find things like "02-08" in the title
    const pattern = /(\d+)-(\d+)/;

    // 1. Process Active Threads
    const activeThreads = await forumChannel.threads.fetchActive();
    console.log(`Found ${activeThreads.threads.size} active threads.`);
    
    for (const thread of activeThreads.threads.values()) {
        await processThread(thread, false);
        processedIds.add(thread.id);
    }

    // 2. Process Archived Threads (with pagination to minimize API calls and stop early)
    console.log(`\nFetching archived threads...`);
    let hasMore = true;
    let lastTimestamp: Date | undefined = undefined;
    let archivedCount = 0;

    while (hasMore) {
        const archived = await forumChannel.threads.fetchArchived({
            limit: 50,
            before: lastTimestamp
        });

        if (archived.threads.size === 0) {
            console.log("No more archived threads found.");
            break;
        }

        archivedCount += archived.threads.size;
        console.log(`Checking batch of ${archived.threads.size} archived threads (Total checked: ${archivedCount})...`);

        for (const thread of archived.threads.values()) {
            if (processedIds.has(thread.id)) continue;

            const archiveTimestamp = thread.archiveTimestamp || 0;
            const createdAt = thread.createdAt || new Date();
            
            // Use archiveTimestamp for cutoff if available, otherwise fallback to createdAt
            const compareTime = archiveTimestamp || createdAt.getTime();

            if (compareTime < dateCutoff.getTime()) {
                console.log(`Reached threads older than cutoff (${new Date(compareTime).toISOString()}). Stopping archived scan.`);
                hasMore = false;
                break;
            }

            await processThread(thread, true);
            processedIds.add(thread.id);
            lastTimestamp = createdAt;
        }

        if (!archived.hasMore) hasMore = false;
    }

    async function processThread(thread: ThreadChannel, isArchived: boolean) {
        const createdAt = thread.createdAt || new Date();

        // 1. Date cutoff check (for active threads or fallback)
        // If it's archived, we already checked the cutoff in the loop
        if (!thread.archived && createdAt < dateCutoff) return;

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
        const match = title.match(pattern);

        if (!match) {
            console.log(`-> Skipping (Passed but no number): ${title}`);
            return;
        }

        const termNumber = parseInt(match[1], 10);
        const legislationNumber = parseInt(match[2], 10);

        let content = "";
        let messageDate = thread.createdAt || new Date();

        let sponsor = "[Unknown]";
        try {
            const starterMsg = await thread.fetchStarterMessage();
            if (starterMsg) {
                content = starterMsg.content;
                messageDate = starterMsg.createdAt;
                sponsor = starterMsg.author?.tag ?? sponsor;
            } else {
                content = "[No text content found]";
            }
        } catch (e) {
            content = "[Unable to fetch message - might be deleted or bot lacks permission]";
        }

        results.push({
            fullTitle: title,
            term: termNumber,
            legislation: legislationNumber,
            link: `https://discord.com/channels/${thread.guildId}/${thread.id}`,
            content: content,
            threadId: thread.id,
            createdAt: messageDate,
            sponsorUsername: sponsor,
        });
        
        const statusLabel = isArchived ? "[ARCHIVED]" : "[ACTIVE]";
        console.log(`-> Processed ${statusLabel}: ${title}`);
    }

    console.log(`\n\n--- EXTRACTION COMPLETE: Found ${results.length} new matches ---`);
    
    if (!fs.existsSync(CITY_NEWS_DIR)) {
        fs.mkdirSync(CITY_NEWS_DIR, { recursive: true });
    }

    console.log('\nCreating markdown files...');
    for (const res of results) {
        createMarkdownFile(res);
    }

    // Update scraped items YAML and status
    updateScrapedItemsYaml(results, runStartTime);
    
    console.log('\nDone!');
}

client.login(BOT_TOKEN);
