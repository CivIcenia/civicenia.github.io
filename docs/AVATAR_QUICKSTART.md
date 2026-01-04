# Avatar Automation - Quick Start Guide

## What This Does

Automatically updates Discord profile pictures for all government and city officials by fetching current avatars from Discord's API.

## Setup (One-Time)

### 1. Get Bot Token

1. Visit: https://discord.com/developers/applications/1457362098672636007
2. Click "Bot" section
3. Copy your bot token (reset if needed)

### 2. Create .env File

```bash
# In project root, create .env:
DISCORD_BOT_TOKEN=your_bot_token_here
```

## Usage

### Updating Avatars

Run whenever officials change their Discord profile pictures:

```bash
bun run update-avatars.ts
```

Output example:
```
📋 Updating government officials...
  Fetching avatar for ChrisChrispie (161282206113857537)...
  ✅ Updated president
  ...
✅ Government officials updated (10 avatars fetched)
```

### Adding New Officials

When adding officials via CMS:

1. **Name**: In-game name
2. **Role**: Select from dropdown
3. **Action**: elected/appointed/etc
4. **Discord User ID**: 18-digit ID (e.g., `161282206113857537`) - **REQUIRED**
   - Get ID: Right-click user in Discord → Copy User ID
   - (Need Developer Mode enabled in Discord settings)
5. Icon URL is auto-generated - no manual entry needed

### Verifying Discord IDs

Check all extracted IDs:

```bash
bun run extract-ids.ts
```

## When to Run

- **After officials change Discord avatars** - Run `update-avatars.ts`
- **Monthly/Quarterly** - Refresh all avatars
- **Before major site updates** - Ensure all avatars are current
- **After adding new officials via CMS** - Run `update-avatars.ts` to fetch their avatar

## How It Works

```
┌─────────────────┐
│   YAML Files    │  Store discord_id + icon URL
│ officials.yml   │  
│ councillors.yml │  
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ update-avatars  │  Fetches current avatars
│     Script      │  from Discord API
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Discord API    │  Returns avatar hash
│  /users/{id}    │  + user data
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   YAML Files    │  Updated with new
│   (Updated)     │  avatar URLs
└─────────────────┘
```

## Benefits

✅ No manual URL updates  
✅ No hosting costs  
✅ No server required  
✅ Runs locally or in CI/CD  
✅ Preserves Discord IDs across syncs  
✅ Handles animated avatars (GIF)  

## Files Modified

| File | Purpose |
|------|---------|
| `update-avatars.ts` | Fetches avatars from Discord |
| `sync-officials.ts` | Preserves discord_id field |
| `extract-ids.ts` | Verification utility |
| `officials.yml` | Stores gov officials + IDs |
| `councillors.yml` | Stores city officials + IDs |
| `config.yml` | CMS form with discord_id field |

## Troubleshooting

**"DISCORD_BOT_TOKEN not found"**
- Create `.env` file in project root
- Add: `DISCORD_BOT_TOKEN=your_token`

**"401 Invalid bot token"**
- Token expired - get new one from Developer Portal

**"404 User not found"**
- Incorrect Discord user ID
- Verify 18-digit ID is correct

**Avatar not updating**
- Ensure `discord_id` is populated in YAML
- Check console for API errors
- Verify bot token is valid

## Full Documentation

See [AVATAR_AUTOMATION.md](./AVATAR_AUTOMATION.md) for complete details.
