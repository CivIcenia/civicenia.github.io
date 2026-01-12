# STV Visualizer - Previous Elections Dropdown

## Summary

Successfully implemented a dropdown menu in the STV visualizer to allow users to select and view previous Icenian senate elections, replacing the demo data button.

## Files Created

1. **`public/stv-data/senate-elections.json`** - Registry of available elections with metadata
2. **`public/stv-data/README.md`** - Instructions for managing election data files  
3. **`public/stv-data/2026-01-january-senate.json`** - Sample election data file
4. **`docs/STV_ELECTIONS_FEATURE.md`** - Complete feature documentation

## Files Modified

1. **`src/pages/stv/visualize.astro`**
   - Removed "Load Demo Data" button
   - Added dropdown selector for elections
   - Added "Load Selected Election" button
   - Separated custom file upload section
   - Updated instructions
   - Implemented async election data loading
   - Removed demo data constant

## How It Works

1. On page load, the elections list is fetched from `/public/stv-data/senate-elections.json`
2. The dropdown is populated with election names and term numbers
3. When a user selects an election and clicks "Load Selected Election":
   - The corresponding JSON file is fetched from `/stv-data/`
   - The data is parsed and validated
   - The visualizer displays the election results
4. Custom file upload remains available as a separate option

## Usage

### For Users
1. Visit `/stv/visualize`
2. Select an election from the dropdown menu
3. Click "Load Selected Election"
4. View the animated visualization

### For Administrators

To add a new election:

1. Export the RCVis JSON from the STV calculator
2. Save it to `/public/stv-data/YYYY-MM-month-senate.json`
3. Add an entry to `/public/stv-data/senate-elections.json`:
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
4. Rebuild: `bun run build`

## Current Election Data

Currently includes metadata for 10 elections (Jan 2026 - Jun 2024). Only the January 2026 sample data file is included. Actual election data files need to be added by:
- Re-running historical elections through the STV calculator
- Obtaining exports from election officials
- Manually constructing from available data

## Benefits

- Easy access to historical election results
- No need to find and download election files
- Consistent user experience
- Centralized data management
- Future-proof for adding more elections

## Next Steps

To fully populate the feature:
1. Obtain or recreate RCVis exports for past elections
2. Add them to `/public/stv-data/`
3. Verify each election displays correctly
4. Consider adding more metadata (winners, vote counts, etc.)
