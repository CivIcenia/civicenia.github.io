# Quick Reference: Election Data File Formats

## File Naming

```
YYYY-MM-month-senate-rcvis.json  → For visualization
YYYY-MM-month-senate-full.json   → For faction analysis
```

## When to Use Each Format

| Need | Use File | Size | Export Button |
|------|----------|------|---------------|
| View round results | `-rcvis.json` | Small (5-20 KB) | "Export for RCVis" |
| Analyze factions | `-full.json` | Large (50-200 KB) | "Export Election" |
| Both features | Both files | - | Export both |

## Quick Export Steps

### From STV Calculator (`/stv`):

1. **After calculating results**, two export buttons appear:

2. **Click "Export for RCVis"**
   - Saves: `rcvis-election-YOUR-NAME.json`
   - Rename to: `YYYY-MM-month-senate-rcvis.json`
   - Use for: Visualization dropdown

3. **Click "Export Election"**
   - Saves: `stv-election-YOUR-NAME.json`
   - Rename to: `YYYY-MM-month-senate-full.json`
   - Use for: Faction analysis dropdown

4. **Place both in:** `/public/stv-data/`

5. **Update registry:** `/src/data/senate-elections.json`
   ```json
   {
     "id": "YYYY-MM-month",
     "name": "Month YYYY",
     "date": "YYYY-MM-DD",
     "term": XX,
     "rcvisUrl": "/stv-data/YYYY-MM-month-senate-rcvis.json",
     "fullUrl": "/stv-data/YYYY-MM-month-senate-full.json",
     "type": "local"
   }
   ```

6. **Rebuild:** `bun run build`

## Example: January 2026

```bash
# Files created:
/public/stv-data/2026-01-january-senate-rcvis.json
/public/stv-data/2026-01-january-senate-full.json

# Registry entry:
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

## Checklist

- [ ] Run election through `/stv` calculator
- [ ] Export for RCVis → rename to `*-rcvis.json`
- [ ] Export Election → rename to `*-full.json`
- [ ] Place both files in `/public/stv-data/`
- [ ] Add entry to `/src/data/senate-elections.json`
- [ ] Run `bun run build`
- [ ] Test visualization dropdown
- [ ] Test faction analysis dropdown

## Common Issues

**"Failed to load election data"**
- File doesn't exist at specified path
- Check file name matches exactly
- Verify file is in `/public/stv-data/`

**Only one feature works**
- Need both file types for both features
- RCVis alone = only visualization works
- Full alone = only faction analysis works

**Dropdown is empty**
- `/src/data/senate-elections.json` not loaded
- Check for JSON syntax errors
- Verify registry entries have correct format

## File Size Comparison

| Election | RCVis | Full | Ratio |
|----------|-------|------|-------|
| Jan 2026 | ~15 KB | ~150 KB | 10x |
| Typical | 5-20 KB | 50-200 KB | ~10x |

**Tip:** If storage is a concern, prioritize `-rcvis.json` files. The visualization is the most-used feature.
