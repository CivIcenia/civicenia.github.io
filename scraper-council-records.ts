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

interface LegislationData {
    fullTitle: string;
    term: string;
    legislation: number;
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
    const headline = data.fullTitle.replace(/^[^\d]*\d{2}-\d{2}[:\s—-]*\s*/i, '').trim() || data.fullTitle;

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
    
    const markdown = `---
layout: "@layouts/news/city-act.astro"
changetocitylaw: true
institution: council
term_number: ${data.term}
act_number: ${data.legislation}
headline: ${headline}
date: ${fullTimestamp}
excerpt: Passed by the ${monthYear} City Council.
document:
  type: markdown
  value: |
${data.content.split('\n').map(line => '    ' + line).join('\n')}
changes: []
icon: /assets/images/law_stock.jpeg
---
[Passed by the ${monthYear} City Council](${data.link})
`;

    fs.writeFileSync(filePath, markdown, 'utf-8');
    console.log(`  Created: ${filename}`);
}

// Update scraped items YAML with new items
function updateScrapedItemsYaml(results: LegislationData[]): void {
    const yamlPath = path.join(__dirname, 'src', 'data', 'city-scraped-items.yml');
    
    let scrapedItems: any[] = [];
    if (fs.existsSync(yamlPath)) {
        const yamlContent = fs.readFileSync(yamlPath, 'utf-8');
        scrapedItems = yaml.load(yamlContent) as any[] || [];
    }
    
    const existingIds = new Set(scrapedItems.map(item => item.id));
    
    for (const res of results) {
        if (!existingIds.has(res.threadId)) {
            scrapedItems.push({
                id: res.threadId,
                title: res.fullTitle,
                date: res.createdAt.toISOString().substring(0, 10), // YYYY-MM-DD format
                checked: false
            });
        }
    }
    
    const newYamlContent = yaml.dump(scrapedItems);
    fs.writeFileSync(yamlPath, newYamlContent, 'utf-8');
    console.log(`Updated ${yamlPath} with ${results.length} new items`);
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
    
    const existingThreadIds = getExistingThreadIds();
    console.log(`Found ${existingThreadIds.size} existing scraped threads`);

    const activeThreads = await forumChannel.threads.fetchActive();
    const archivedThreads = await forumChannel.threads.fetchArchived({
        limit: 100,
    });


    // Find the tag ID for "Passed"
    const passedTag = forumChannel.availableTags.find(tag => tag.name.toLowerCase() === "passed");
    if (!passedTag) {
        console.error("No 'Passed' tag found in forum channel.");
        return;
    }
    const passedTagId = passedTag.id;

    const allThreads = new Map<string, ThreadChannel>();
    activeThreads.threads.forEach((t) => allThreads.set(t.id, t));
    archivedThreads.threads.forEach((t) => allThreads.set(t.id, t));

    const results: LegislationData[] = [];
    // Regex to find things like "02-08" in the title
    const pattern = /(\d+)-(\d+)/;

    for (const [id, thread] of allThreads) {
        // Only process threads with the 'Passed' tag
        if (!thread.appliedTags?.includes(passedTagId)) {
            console.log(`-> Skipping (not Passed): ${thread.name}`);
            continue;
        }
        if (existingThreadIds.has(id)) {
            console.log(`-> Skipping (already scraped): ${thread.name}`);
            continue;
        }

        const title = thread.name;
        const match = title.match(pattern);

        if (!match) {
            console.log(`-> Skipping (Passed but no number): ${title}`);
            continue;
        }

        const termNumber = match[1];
        // ParseInt ensures "08" becomes 8 (number)
        const legislationNumber = parseInt(match[2], 10);

        let content = "";
        let messageDate = thread.createdAt || new Date();

        try {
            const starterMsg = await thread.fetchStarterMessage();
            if (starterMsg) {
                content = starterMsg.content;
                messageDate = starterMsg.createdAt;
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
            threadId: id,
            createdAt: messageDate,
        });
        
        console.log(`-> Processed: ${title}`);
    }

    console.log(`\n\n--- EXTRACTION COMPLETE: Found ${results.length} new matches ---`);
    
    if (!fs.existsSync(CITY_NEWS_DIR)) {
        fs.mkdirSync(CITY_NEWS_DIR, { recursive: true });
    }

    console.log('\nCreating markdown files...');
    for (const res of results) {
        createMarkdownFile(res);
    }

    // Update scraped items YAML
    updateScrapedItemsYaml(results);
    
    console.log('\nDone!');
}

client.login(BOT_TOKEN);