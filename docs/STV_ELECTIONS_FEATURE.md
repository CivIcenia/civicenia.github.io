# STV Visualizer - Previous Elections Feature

## Overview

The STV visualizer now allows users to select and view previous Icenian senate elections from a dropdown menu, replacing the old "Load Demo Data" button.

## Changes Made

### 1. New Data Structure (`/public/stv-data/senate-elections.json`)

A JSON file that contains metadata for all available senate elections:

```json
{
  "id": "2026-01-january",
  "name": "January 2026",
  "date": "2026-01-07",
  "term": 43,
  "dataUrl": "/stv-data/2026-01-january-senate.json",
  "type": "local"
}
```

### 2. Updated UI (`src/pages/stv/visualize.astro`)

- Replaced the "Load Demo Data" button with a dropdown menu for selecting elections
- Added a separate section for uploading custom JSON files
- Updated instructions to reflect the new workflow

### 3. New Directory Structure

Created `/public/stv-data/` directory to store RCVis JSON files for each election.

## Adding New Election Data

When a new senate election occurs:

### Step 1: Export the Election Data

1. Run the election through the STV calculator at `/stv`
2. Click "Export for RCVis" to download the JSON file
3. Save the file with a descriptive name (e.g., `2026-02-february-senate.json`)

### Step 2: Add to Public Directory

Place the JSON file in `/public/stv-data/`

### Step 3: Update Elections Registry

Add an entry to `/public/stv-data/senate-elections.json`:

```json
{
  "id": "2026-02-february",
  "name": "February 2026",
  "date": "2026-02-04",
  "term": 44,
  "dataUrl": "/stv-data/2026-02-february-senate.json",
  "type": "local"
}
```

**Important:** Add new elections to the top of the array so they appear first in the dropdown.

### Step 4: Rebuild and Deploy

```bash
bun run build
```

The election will now appear in the dropdown menu.

## Historical Elections

To add historical elections (pre-dating this feature):

1. **Locate the election results:**
   - Check the election announcement in `/src/content/news/`
   - Look for online Python calculator links (e.g., `online-python.com/...`)
   - Check if raw ballot data is available

2. **Recreate or obtain the RCVis export:**
   - If you have raw ballot data, re-run through the STV calculator
   - If only results are available, you may need to manually construct the JSON

3. **Add to the system** following Steps 2-4 above

## File Format

The RCVis JSON format expected by the visualizer:

```json
{
  "config": {
    "contest": "Election Name",
    "date": "YYYY-MM-DD",
    "jurisdiction": "Icenia",
    "office": "Senate",
    "threshold": "7.500"
  },
  "results": [
    {
      "round": 1,
      "tally": {
        "CandidateName": "10.000"
      },
      "quota": 7.500,
      "exhausted": 0,
      "isFinalRound": false,
      "tallyResults": [
        {
          "elected": "CandidateName",
          "transfers": {}
        }
      ]
    }
  ]
}
```

## Maintenance

### Elections List Order

Elections in the dropdown are shown in the order they appear in `senate-elections.json`. Keep the most recent elections at the top of the array.

### Removing Old Elections

To remove elections from the dropdown:
1. Delete the entry from `senate-elections.json`
2. Optionally delete the JSON file from `/public/stv-data/`

### Storage Considerations

- Each RCVis JSON file is typically 5-20 KB
- Consider archiving very old elections if storage becomes a concern
- The `/public/stv-data/` directory is included in the build output

## Technical Notes

- The dropdown is populated dynamically from the imported JSON data
- Election data is fetched asynchronously when selected
- If a data file is missing, the user sees a clear error message
- The custom file upload functionality remains unchanged and independent
- TypeScript types are defined for the SenateElection interface

## Future Enhancements

Potential improvements:
- Group elections by year
- Add candidate names to the dropdown
- Show winner information in the selection
- Implement lazy loading for very old elections
- Add direct links from election news posts to visualizer
