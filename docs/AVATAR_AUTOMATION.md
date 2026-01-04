# Avatar Automation System

This system automates the process of updating Discord profile pictures for government and city officials.

## Overview

Instead of manually updating avatar URLs when officials change their Discord profile pictures, the system:
1. Stores Discord user IDs alongside avatar URLs
2. Fetches current avatars from Discord's API when needed
3. Automatically updates the YAML files with fresh URLs

## Setup

### 1. Get Your Discord Bot Token

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application (ID: `1457362098672636007`)
3. Go to the "Bot" section
4. Copy the bot token (click "Reset Token" if needed)

### 2. Configure Environment

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` and add your bot token:

```env
DISCORD_BOT_TOKEN=your_actual_bot_token_here
```

**Important:** Never commit the `.env` file to git! It's already in `.gitignore`.

## Usage

### Adding New Officials via CMS

When creating a new official change post in Decap CMS:

1. Fill in the official's name
2. Select their role
3. Select the action (elected, appointed, etc.)
4. **Discord User ID**: Enter their 18-digit Discord user ID (e.g., `161282206113857537`) - **REQUIRED**
   - To get a user ID: Enable Developer Mode in Discord → Right-click user → Copy User ID
5. For senators/councillors: Select the seat number

**Note:** The icon URL field has been removed - icons are now automatically fetched from Discord.

### Updating Avatars

Run the avatar update script whenever you want to refresh profile pictures:

```bash
bun run update-avatars.ts
```

This will:
- Fetch current avatars for all officials with a `discord_id`
- Update the `icon` fields in `officials.yml` and `councillors.yml`
- Preserve all other data

**When to run:**
- After officials change their Discord avatars
- Periodically (monthly/quarterly) to keep avatars fresh
- Before important site updates

### Syncing Officials from News Posts

The existing sync script continues to work and now preserves both icons and discord_ids:

```bash
bun run sync-officials.ts
```

This reads all official change posts and updates the officials files. Since icon URLs are no longer in news posts, the sync script preserves existing icons from the YAML files. After syncing, run the avatar update script to fetch any missing icons:

```bash
bun run update-avatars.ts
```

## How It Works

### Data Structure

Each official can have both fields:
```yaml
president:
  name: "ChrisChrispie"
  icon: "https://cdn.discordapp.com/avatars/161282206113857537/..."
  discord_id: "161282206113857537"  # <-- Stored for auto-updates
```

### Update Process

1. `update-avatars.ts` reads the YAML files
2. For each official with a `discord_id`:
   - Calls Discord REST API: `GET /users/{discord_id}`
   - Constructs the CDN URL from the response
   - Updates the `icon` field
3. Writes updated YAML back to disk

### Discord API

The script uses Discord's REST API with bot authentication:
- **Endpoint**: `https://discord.com/api/v10/users/{user_id}`
- **Auth**: Bot token in `Authorization` header
- **Rate Limit**: 100ms delay between requests (safe)
- **Format**: Returns user object with avatar hash

Avatar URLs are constructed as:
- WebP (static): `https://cdn.discordapp.com/avatars/{id}/{hash}.webp?size=256`
- GIF (animated): `https://cdn.discordapp.com/avatars/{id}/{hash}.gif?size=256`

## Files Modified

- **[update-avatars.ts](update-avatars.ts)** - New script to fetch and update avatars
- **[sync-officials.ts](sync-officials.ts)** - Modified to preserve `discord_id` field
- **[public/admin/config.yml](public/admin/config.yml)** - CMS config updated with `discord_id` field
- **[src/data/officials.yml](src/data/officials.yml)** - Now includes `discord_id` for each official
- **[src/data/councillors.yml](src/data/councillors.yml)** - Now includes `discord_id` for each official
- **[.env.example](.env.example)** - Template for environment variables

## Troubleshooting

### "DISCORD_BOT_TOKEN not found"
- Make sure you created a `.env` file
- Check that the token is on the line: `DISCORD_BOT_TOKEN=your_token`
- Ensure no spaces around the `=`

### "401 Invalid bot token"
- Your bot token may have expired or been reset
- Get a new token from the Discord Developer Portal

### "404 User not found"
- The Discord user ID is incorrect
- Verify the 18-digit ID is correct

### Avatars not updating
- Make sure `discord_id` is populated in the YAML files
- Run the script with proper bot token
- Check for API errors in the console output

## Cost & Hosting

- **API calls**: Free (within Discord's rate limits)
- **Hosting**: None required - script runs locally or in build
- **Token storage**: Secure in `.env` (not committed to git)

This approach avoids any hosting costs while still providing automated updates when needed.

## Security Notes

- Bot token is stored locally in `.env` file
- Never commit `.env` to version control
- Bot only needs read access to fetch user data
- No OAuth flows or user permissions required
- Script can be run locally or in trusted CI/CD only
