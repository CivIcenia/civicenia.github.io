# Icenia Website Redesign - Homepage Update

## Changes Made

This update redesigns the homepage with a modern, government-style aesthetic inspired by the provided mockup.

### New Files Created:

1. **`src/styles/icenia-theme.css`**
   - Custom CSS theme with Icenia colors (blue: #1a2c5b, gold: #c5a028)
   - Reusable components: status bar, hero section, cards, buttons
   - Responsive design for mobile and desktop

2. **`src/pages/index.astro`** (replaced)
   - New homepage with hero section
   - Status bar showing security level, motto, and coordinates
   - News ticker pulling from recent news items
   - Six information cards (The Union, Government, Diplomacy, Economy, Infrastructure, Join Us)
   - Custom navigation bar with Icenia branding

3. **`src/pages/union/index.astro`**
   - State showcase page
   - Displays all states/territories with descriptions
   - Information from borders.json.ts
   - Color-coded state cards
   - Links to map and borders JSON

4. **`src/pages/guide/index.astro`**
   - New player guide
   - Quick start guide (5 steps)
   - Citizenship tiers (Resident, Citizen, Full Citizen)
   - Activities in Icenia
   - FAQ section
   - Discord and community links

### Navigation Structure

The new site structure includes:
- **Home** (Landing page)
- **News** (Existing)
- **Laws** (Existing)
- **Officials** (Existing)
- **The Union** (New - States & Territory showcase)
- **New Player Guide** (New - How to join, Citizenship tiers)

### TODO: Hero Image

⚠️ **IMPORTANT**: The hero section currently uses a placeholder path:
```
/assets/images/hero-placeholder.jpg
```

**You need to:**
1. Take a sweeping cinematic screenshot of Icenia City with shaders
2. Save it as `hero-placeholder.jpg` (or rename the reference)
3. Place it in `public/assets/images/`

Recommended dimensions: 1920x1080 or larger

### Design Features

- **Status Bar**: Displays security level, motto, coordinates, and date
- **Hero Section**: Full-width background image with headline and CTA buttons
- **News Ticker**: Shows 5 most recent news items
- **Card Grid**: Responsive grid layout showcasing different aspects of Icenia
- **Color Scheme**: 
  - Primary Blue: `#1a2c5b`
  - Gold Accent: `#c5a028`
  - Off-White: `#f4f4f4`
- **Typography**: Merriweather (headings) and Roboto (body)

### Testing

To test the new design:
```bash
bun run dev
```

Then visit: `http://localhost:4000`

### Next Steps (Optional Future Enhancements)

1. **Dropdown Menus**: Add dropdown navigation for Government, The Union, etc.
2. **Interactive Map**: Embed SVG map on Union page with hover effects
3. **Dynamic Officials**: Pull current Senate Speaker from election data
4. **Image Gallery**: Add screenshots to state cards
5. **Animation**: Add subtle transitions and loading effects

## Compatibility

- Works with existing Astro layout system
- Uses existing helpers (Strings, Arrays, Astros)
- Compatible with borders.json.ts data
- Maintains existing news collection structure
- Preserves all existing pages (laws, officials, news)
