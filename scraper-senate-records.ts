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
const STATUS_FILE = path.join(__dirname, 'src', 'data', 'scraper-status.yml');

interface LegislationData {
    fullTitle: string;
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
function getSenateTermForDate(targetDate: Date): number | null {
    const NEWS_DIR = path.join(__dirname, 'src', 'content', 'news');
    if (!fs.existsSync(NEWS_DIR)) return null;

    const files = fs.readdirSync(NEWS_DIR).filter(f => f.endsWith('.md'));
    let bestTerm: number | null = null;
    let bestDate: Date | null = null;

    for (const file of files) {
        const filePath = path.join(NEWS_DIR, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
        if (!frontmatterMatch) continue;

        let fm: any;
        try {
            fm = yaml.load(frontmatterMatch[1]) as any;
        } catch (e) {
            continue;
        }
        if (!fm) continue;

        // Only consider senate election posts that have a numeric term
        if (!(fm.changetype === 'senate-election' || fm.changetype === 'senate-byelection') || typeof fm.term !== 'number') {
            continue;
        }

        // Determine the post date from frontmatter or filename
        let postDate: Date | null = null;
        if (fm.date) {
            try { postDate = new Date(fm.date); } catch (e) { postDate = null; }
        }
        if (!postDate) {
            // Try to parse leading YYYY-MM-DD from filename
            const m = file.match(/^(\d{4}-\d{2}-\d{2})/);
            if (m) postDate = new Date(m[1]);
        }
        if (!postDate) continue;

        if (postDate.getTime() <= targetDate.getTime()) {
            if (!bestDate || postDate.getTime() > bestDate.getTime()) {
                bestDate = postDate;
                bestTerm = fm.term;
            }
        }
    }

    return bestTerm;
}

function createMarkdownFile(data: LegislationData): void {
    const date = data.createdAt;
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const fullTimestamp = formatFullDate(date);
    const monthYear = `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
    
    // Strip "Res.", "02-08", etc from headline
    const rawHeadline = data.fullTitle.replace(/^[^\d]*\d{2}-\d{2}[:\s—-]*\s*/i, '').trim() || data.fullTitle;
    const headline = formatHeadline(rawHeadline);
    const slug = generateSlug(headline);
    const filename = `${dateStr}-${slug}.md`;
    const filePath = path.join(NEWS_DIR, filename);
    
    if (fs.existsSync(filePath)) {
        console.log(`  Skipping (file exists): ${filename}`);
        return;
    }
    
    const safeContent = sanitizeContent(data.content);

    let termNumber = getSenateTermForDate(date);
    // Fallback overrides for known terms (YYYY-MM => term number)
    if (!termNumber) {
        const overrides: Record<string, number> = {
            '2026-01': 43
        };
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (overrides[key]) termNumber = overrides[key];
    }
    const footer = termNumber ? `[Passed by Term ${termNumber} Senate](${data.link})` : `[Passed by the ${monthYear} Senate](${data.link})`;

    const markdown = `---
changetolaw: true
layout: "@layouts/news/act.astro"
institution: senate
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
${footer}
`;

    fs.writeFileSync(filePath, markdown, 'utf-8');
    console.log(`  Created: ${filename}`);
}

// Update scraped items YAML and status
function updateScrapedItemsYaml(results: LegislationData[], runStartTime: Date): void {
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

    // Update status file
    let status: any = {};
    if (fs.existsSync(STATUS_FILE)) {
        status = yaml.load(fs.readFileSync(STATUS_FILE, 'utf-8')) || {};
    }
    status.senate_last_scraped_at = runStartTime.toISOString();
    fs.writeFileSync(STATUS_FILE, yaml.dump(status), 'utf-8');
    console.log(`Updated ${STATUS_FILE} with new senate_last_scraped_at: ${status.senate_last_scraped_at}`);
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
    console.log(`Scanning Senate Forum: ${forumChannel.name}`);
    
    // Load last scraped date from status file
    let dateCutoff = new Date('2026-01-10');
    if (fs.existsSync(STATUS_FILE)) {
        const status = yaml.load(fs.readFileSync(STATUS_FILE, 'utf-8')) as any;
        if (status?.senate_last_scraped_at) {
            dateCutoff = new Date(status.senate_last_scraped_at);
        }
    }
    console.log(`--------------------------------------------------`);
    console.log(`CUTOFF DATE: ${dateCutoff.toISOString()}`);
    console.log(`(Threads archived or created before this will be skipped)`);
    console.log(`--------------------------------------------------\n`);

    const existingThreadIds = getExistingThreadIds();
    console.log(`Found ${existingThreadIds.size} existing scraped threads`);

    const passedTag = forumChannel.availableTags.find(tag => tag.name.toLowerCase() === "passed");
    if (!passedTag) {
        console.error("No 'Passed' tag found in forum channel.");
        return;
    }
    const passedTagId = passedTag.id;

    const results: LegislationData[] = [];
    const processedIds = new Set<string>();

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

        let content = "";
        let sponsor = "[Unknown]";
        try {
            const starterMsg = await thread.fetchStarterMessage();
            if (starterMsg) {
                content = starterMsg.content;
                sponsor = starterMsg.author?.tag ?? sponsor;
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
            sponsorUsername: sponsor,
        });
        
        const statusLabel = isArchived ? "[ARCHIVED]" : "[ACTIVE]";
        console.log(`-> Processed ${statusLabel}: ${title}`);
    }

    console.log(`\n\n--- EXTRACTION COMPLETE: Found ${results.length} new matches ---`);
    
    if (!fs.existsSync(NEWS_DIR)) {
        fs.mkdirSync(NEWS_DIR, { recursive: true });
    }

    for (const res of results) {
        createMarkdownFile(res);
    }

    updateScrapedItemsYaml(results, runStartTime);
    
    console.log('\nDone!');
}

client.login(BOT_TOKEN);
