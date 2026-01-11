# Faction Analysis Elections Feature - Implementation Summary

## Overview

Extended the STV visualizer's election dropdown feature to also support the Faction & Similarity Analysis section. Users can now select previous elections from a dropdown for both visualization types.

## File Naming Standard

Established a standardized naming convention for election data files:

### Format
- **RCVis (Visualization)**: `YYYY-MM-month-senate-rcvis.json`
- **Full (Faction Analysis)**: `YYYY-MM-month-senate-full.json`

### Examples
- `2026-01-january-senate-rcvis.json` - Round-by-round results for visualization
- `2026-01-january-senate-full.json` - Complete ballot data for faction analysis

### Rationale
- Clear distinction between file types
- Chronological ordering when sorted
- Consistent pattern easy to follow
- Both files for same election share prefix

## Changes Made

### 1. File Standardization

**Renamed existing files:**
- `rcvis-election-senate-election-january-2026-term-43.json` → `2026-01-january-senate-rcvis.json`
- `stv-election-senate-election-january-2026-term-43.json` → `2026-01-january-senate-full.json`

### 2. Data Structure Update

**Updated `/src/data/senate-elections.json`:**
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

Changed from single `dataUrl` to separate `rcvisUrl` and `fullUrl` properties.

### 3. UI Updates

**Modified `/src/pages/stv/visualize.astro`:**

#### TypeScript Interface
```typescript
interface SenateElection {
    id: string;
    name: string;
    date: string;
    term: number;
    rcvisUrl: string;   // For visualization
    fullUrl: string;    // For faction analysis
    type: 'local';
}
```

#### Faction Analysis Section
- Added dropdown selector for elections
- Separated custom file upload into its own section
- Removed "Load Demo Data" button (demo still available via code for testing)
- Updated labels and instructions

#### Loading Logic
- Main visualizer now uses `election.rcvisUrl`
- Faction analysis now uses `election.fullUrl`
- Both sections populate from same elections registry
- Async loading with proper error handling

### 4. Documentation Updates

**Updated `/public/stv-data/README.md`:**
- Documented both file formats
- Explained naming convention
- Clarified when to use each format
- Added examples for both file types

## Feature Comparison

| Feature | Main Visualizer | Faction Analysis |
|---------|----------------|------------------|
| Data Format | RCVis (results only) | Full (with ballots) |
| File Size | 5-20 KB | 50-200 KB |
| Shows | Round-by-round results | Voter preferences & correlations |
| Dropdown | ✅ Yes | ✅ Yes |
| Custom Upload | ✅ Yes | ✅ Yes |
| Demo Data | ❌ Removed | ✅ Available (in code) |

## Usage

### For Users

**Main Visualization:**
1. Visit `/stv/visualize`
2. Select election from first dropdown
3. Click "Load Selected Election"
4. View animated round-by-round results

**Faction Analysis:**
1. Scroll to "Faction & Similarity Analysis" section
2. Select election from dropdown
3. Click "Load Selected Election"
4. Explore network graph, heatmap, and political map

### For Administrators

**Adding a new election:**

1. **Run election through STV calculator** (`/stv`)

2. **Export both formats:**
   ```
   "Export for RCVis" → 2026-02-february-senate-rcvis.json
   "Export Election" → 2026-02-february-senate-full.json
   ```

3. **Place in `/public/stv-data/`**

4. **Update registry** (`/src/data/senate-elections.json`):
   ```json
   {
     "id": "2026-02-february",
     "name": "February 2026",
     "date": "2026-02-04",
     "term": 44,
     "rcvisUrl": "/stv-data/2026-02-february-senate-rcvis.json",
     "fullUrl": "/stv-data/2026-02-february-senate-full.json",
     "type": "local"
   }
   ```

5. **Rebuild:** `bun run build`

## Current Status

### Complete
- ✅ File naming standardization
- ✅ January 2026 election data in both formats
- ✅ Dropdown menus for both sections
- ✅ Async loading for both file types
- ✅ Updated documentation
- ✅ Error handling for missing files
- ✅ Custom file upload still available

### Pending
- ⏳ Historical election data files (Terms 34-42)
- ⏳ Obtain or recreate full ballot data for older elections
- ⏳ Test with multiple elections loaded

## Technical Notes

### Why Two Formats?

**RCVis (Visualization):**
- Smaller file size
- Only contains final tallies per round
- Sufficient for animated bar charts
- Exported via "Export for RCVis" button

**Full (Faction Analysis):**
- Contains raw voter preference data
- Required for calculating:
  - Transfer probabilities
  - Rank correlations
  - Political distance maps
- Exported via "Export Election" button

### Backward Compatibility

The new system maintains compatibility with:
- Existing RCVis files (just rename them)
- Existing full export files (just rename them)
- Custom file uploads (unchanged functionality)

### Future Enhancements

Potential improvements:
- Show which elections have faction data available
- Indicate data completeness in dropdown
- Add "last updated" date to elections
- Support for other election types (city council, etc.)
- Batch import for historical elections

## File Locations

```
/public/stv-data/
├── 2026-01-january-senate-rcvis.json  ✅ Available
├── 2026-01-january-senate-full.json   ✅ Available
├── 2025-12-december-senate-rcvis.json ⏳ Needed
├── 2025-12-december-senate-full.json  ⏳ Needed
└── README.md                          ✅ Updated

/src/data/
└── senate-elections.json              ✅ Updated (10 elections listed)

/docs/
├── STV_ELECTIONS_FEATURE.md           ✅ Existing
├── ADDING_ELECTION_DATA.md            ✅ Existing
└── (this file)                        ✅ New
```

## Testing Checklist

- [x] Dropdown populates correctly for visualization
- [x] Dropdown populates correctly for faction analysis
- [x] January 2026 loads in visualization
- [x] January 2026 loads in faction analysis
- [ ] Multiple elections tested
- [ ] Error message shows for missing files
- [ ] Custom upload still works for both sections
- [ ] Build completes without errors

## Migration Path

To populate historical elections:

1. **Priority 1 (Recent, likely has data):**
   - December 2025 (Term 42)
   - May 2025 (Term 41)
   - December 2024 (Term 40)

2. **Priority 2 (Historical interest):**
   - November 2024 - October 2024
   - Earlier 2024 elections

3. **Sources:**
   - Discord election results channels
   - `/src/content/news/` markdown files
   - Online Python calculator links
   - Community members who saved data
