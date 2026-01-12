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

dotenv.config();

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
// Icenia City Council Records Forum
const FORUM_CHANNEL_ID = '1432219989183823902';
const CITY_NEWS_DIR = path.join(__dirname, 'src', 'content', 'city-news');

interface LegislationData {
    fullTitle: string;
    term: string;
    legislation: string;
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
        
        // Extract thread ID from Discord link at the end of the file
        const linkMatch = content.match(/discord\.com\/channels\/\d+\/(\d+)/);
        if (linkMatch) {
            existingIds.add(linkMatch[1]);
        }
    }
    
    return existingIds;
}

// Generate a slug from the title
function generateSlug(title: string): string {
    // Remove the XX-XX prefix pattern
    const cleanTitle = title.replace(/^\d+-\d+\s*/, '').trim();
    
    return cleanTitle
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 50);
}

// Create markdown file for a legislation
function createMarkdownFile(data: LegislationData): void {
    const date = data.createdAt;
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const monthYear = `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
    
    const slug = generateSlug(data.fullTitle);
    const filename = `${dateStr}-${slug}.md`;
    const filePath = path.join(CITY_NEWS_DIR, filename);
    
    // Skip if file already exists
    if (fs.existsSync(filePath)) {
        console.log(`  Skipping (file exists): ${filename}`);
        return;
    }
    
    // Escape the content for YAML
    const escapedContent = data.content
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"');
    
    // Generate a headline from the title (remove XX-XX prefix)
    const headline = data.fullTitle.replace(/^\d+-\d+\s*/, '').trim() || data.fullTitle;
    
    const markdown = `---
layout: "@layouts/news/city-act.astro"
changetocitylaw: true
institution: council
term_number: ${data.term}
act_number: ${data.legislation}
headline: ${headline}
date: ${dateStr} 12:00:00 +0000
excerpt: Passed by the ${monthYear} City Council.
document:
  type: markdown
  value: |
${data.content.split('\n').map(line => '    ' + line).join('\n')}
changes: []
icon: /assets/images/law_stock.jpeg
---

${headline}

---
[Passed by the ${monthYear} City Council](${data.link})
`;

    fs.writeFileSync(filePath, markdown, 'utf-8');
    console.log(`  Created: ${filename}`);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.MessageContent,
    ]
});

client.once('ready', async () => {
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
    console.log(`Scanning Forum: ${forumChannel.name}`);

    // Get existing thread IDs to avoid duplicates
    const existingThreadIds = getExistingThreadIds();
    console.log(`Found ${existingThreadIds.size} existing scraped threads`);

    const activeThreads = await forumChannel.threads.fetchActive();
    const archivedThreads = await forumChannel.threads.fetchArchived({
        limit: 100,
    });

    const allThreads = new Map<string, ThreadChannel>();
    activeThreads.threads.forEach((t) => allThreads.set(t.id, t));
    archivedThreads.threads.forEach((t) => allThreads.set(t.id, t));

    const results: LegislationData[] = [];
    const pattern = /(\d+)-(\d+)/;

    for (const [id, thread] of allThreads) {
        // Skip if already scraped
        if (existingThreadIds.has(id)) {
            console.log(`-> Skipping (already scraped): ${thread.name}`);
            continue;
        }

        const title = thread.name;
        const match = title.match(pattern);

        if (match) {
            const termNumber = match[1];
            const legislationNumber = match[2];

            let content = "";
            try {
                const starterMsg = await thread.fetchStarterMessage();
                content = starterMsg ? starterMsg.content : "[No text content found]";
            } catch (e) {
                content = "[Unable to fetch message - might be deleted or bot lacks permission]";
            }

            results.push({
                fullTitle: title,
                term: termNumber,
                legislation: legislationNumber,
                link: `https://discord.com/channels/${thread.guildId}/${thread.id}`,
                content: content,
                threadId: id,
                createdAt: thread.createdAt || new Date(),
            });
            
            console.log(`-> Processed: ${title}`);
        }
    }

    console.log(`\n\n--- EXTRACTION COMPLETE: Found ${results.length} new matches ---`);
    
    // Ensure output directory exists
    if (!fs.existsSync(CITY_NEWS_DIR)) {
        fs.mkdirSync(CITY_NEWS_DIR, { recursive: true });
    }

    // Create markdown files
    console.log('\nCreating markdown files...');
    for (const res of results) {
        createMarkdownFile(res);
    }
    
    console.log('\nDone!');
}

client.login(BOT_TOKEN);