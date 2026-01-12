# Senate Election STV Data

This directory contains election data files for Icenian Senate elections in two formats.

## File Naming Convention

Each election has two files following these patterns:

- **RCVis format** (for visualization): `YYYY-MM-month-senate-rcvis.json`
- **Full format** (for faction analysis): `YYYY-MM-month-senate-full.json`

Examples:
- `2026-01-january-senate-rcvis.json` - Results and round data only
- `2026-01-january-senate-full.json` - Complete ballot data with voter rankings

## File Formats

### RCVis Format (Visualization)

Used by the main STV visualizer for animated round-by-round results:

```json
{
  "config": {
    "contest": "January 2026 Senate Election",
    "date": "2026-01-07",
    "jurisdiction": "Icenia",
    "office": "Senate",
    "threshold": "7.500"
  },
  "results": [
    {
      "round": 1,
      "tally": {
        "Candidate1": "10.000",
        "Candidate2": "8.000"
      },
      "quota": 7.500,
      "exhausted": 0,
      "isFinalRound": false,
      "tallyResults": [
        {
          "elected": "Candidate1",
          "transfers": {}
        }
      ]
    }
  ]
}
```

### Full Format (Faction Analysis)

Used by the faction & similarity analysis tool. Includes raw ballot data:

```json
{
  "version": "2.1",
  "electionName": "January 2026 Senate Election",
  "candidates": ["Candidate1", "Candidate2"],
  "ballots": [
    {
      "voter": "voter1",
      "rankings": ["Candidate1", "Candidate2"]
    }
  ],
  "nameMatches": {
    "alias1": "Candidate1"
  }
}
```

## Adding New Elections

1. **Run the election through the STV calculator** at `/stv`
2. **Export both formats:**
   - Click "Export for RCVis" → Save as `YYYY-MM-month-senate-rcvis.json`
   - Click "Export Election" → Save as `YYYY-MM-month-senate-full.json`
3. **Place both files** in this directory
4. **Update the registry** at `/public/stv-data/senate-elections.json`:

```json
{
  "id": "2026-01-january",
  "name": "January 2026",
  "date": "2026-01-07",
  "term": 43,
  "rcvisUrl": "/stv-data/2026-01-january-senate-rcvis.json",
  "fullUrl": "/stv-data/2026-01-january-senate-full.json",
  "type": "local"
}
```

The election will now appear in both dropdown menus on the visualizer page.

## Why Two Formats?

- **RCVis format** is smaller (5-20 KB) and optimized for displaying results
- **Full format** is larger (50-200 KB) but contains voter preference data needed for faction analysis
- Not all elections need faction analysis data - RCVis alone is sufficient for basic visualization

## Data Sources

Election data can be obtained from:
- The STV calculator exports (most reliable)
- Online Python calculator links in election announcement posts
- Historical election records in `/src/content/news/`
- Discord election result announcements
