# Quick Guide: Adding Historical Election Data

## Where to Find Election Data

### 1. From Election News Posts

Check `/src/content/news/` for senate election announcements. Some contain:
- Online Python calculator links (e.g., `online-python.com/...`)
- Direct links to results
- Ballot data

Example: `2026-01-07-january-2026-senate-election.md` contains:
```
The counting of ballots can be found here: https://www.online-python.com/cFT4IN3ni7
```

### 2. From Discord Announcements

Historical election results were posted in Discord channels. Check:
- `#election-results`
- `#senate-announcements`
- Pinned messages

### 3. Recreation from Results

If you only have the final results (winners), you can:
1. Note this is incomplete but better than nothing
2. Create a simplified JSON showing just the final round
3. Mark it as "Results Only" in the election name

## Priority Elections to Add

Based on the metadata in `senate-elections.json`, prioritize:

1. **Recent elections (2024-2025)** - Most likely to have complete data
2. **First STV elections** - Historical significance
3. **Controversial/close elections** - High interest

## Quick Data Entry Process

For each election:

1. **Find the data source** (Python link, Discord, etc.)
2. **Get ballot data if possible:**
   - Copy raw ballots
   - Paste into STV calculator at `/stv`
   - Set correct seat count
   - Calculate results
   - Export for RCVis
   
3. **If only results available:**
   - Document what rounds you know
   - Create partial JSON
   - Add note in config: `"note": "Partial data - results only"`

4. **Save and register:**
   - Save to `/public/stv-data/YYYY-MM-month-senate.json`
   - Verify entry exists in `/public/stv-data/senate-elections.json`
   - Test in visualizer

## Data Quality Levels

- ✅ **Complete**: Full ballot data, all rounds, vote transfers
- ⚠️ **Partial**: Final results only, some rounds missing
- ❌ **Missing**: No data file yet (listed but not loaded)

Mark data quality in filenames or add metadata if needed.

## Example: Converting Python Calculator Link

If you find a link like `online-python.com/cFT4IN3ni7`:

1. Visit the link
2. Look for the raw ballot data in the code
3. Extract candidate list and ballots
4. Re-run through local STV calculator
5. Export as RCVis
6. Save to `/public/stv-data/`

## Testing

After adding each file:
```bash
bun run build
# Check for errors

# Test locally
bun run dev
# Navigate to /stv/visualize
# Select the new election
# Verify it loads and displays correctly
```

## Need Help?

- Check `/docs/STV_ELECTIONS_FEATURE.md` for full documentation
- See `/public/stv-data/2026-01-january-senate.json` for format example
- Review RCVis format at `/src/pages/stv/visualize.astro` instructions section
