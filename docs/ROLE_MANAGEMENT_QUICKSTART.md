# Role Management System - Quick Start

## What You Can Do Now

✅ **Add/Remove Roles** - Create new official positions for city or republic  
✅ **Configure Multi-Seat Roles** - Define roles with numbered seats (like senators)  
✅ **Set Number of Seats** - Easily change how many seats a multi-seat role has  
✅ **Control Display Order** - Decide the order roles appear on official pages

## Quick Access

### Via Admin Panel (Easiest)
1. Run: `bun run admin.ts`
2. Open: http://localhost:4000/admin/index.html
3. Navigate to: **Data** → **Role Configuration**
4. Make changes and save

### Via File Edit
Edit: [`src/data/role-config.yml`](../src/data/role-config.yml)

## Current Roles

### Republic (6 roles)
- President (single seat)
- Secretary of Defense (single seat)
- Secretary of the Interior (single seat)
- Secretary of Treasury (single seat)
- Speaker of the Senate (single seat)
- Senator (5 seats)

### City (2 roles)
- Mayor (single seat)
- Councillor (5 seats)

## Common Tasks

### Add a New Single-Seat Role
```yaml
- id: "vice_president"
  display_name: "Vice President"
  multi_seat: false
  order: 2
```

### Add a New Multi-Seat Role
```yaml
- id: "magistrate"
  display_name: "Magistrate"
  multi_seat: true
  num_seats: 3
  order: 10
```

### Change Number of Seats
Find the role and change `num_seats`:
```yaml
- id: "senator"
  num_seats: 7  # Changed from 5 to 7
```

### Change Display Order
Modify the `order` field (lower = appears first):
```yaml
- id: "president"
  order: 1  # Appears first
```

## After Making Changes

1. **Sync officials data**:
   ```powershell
   bun run sync-officials.ts
   ```

2. **Build the site**:
   ```powershell
   bun run build
   ```

3. **Test locally** (optional):
   ```powershell
   bun run dev
   ```

## Full Documentation

See [ROLE_MANAGEMENT.md](./ROLE_MANAGEMENT.md) for complete details including:
- How the system works internally
- Adding role mappings for official change posts
- Troubleshooting guide
- Advanced configuration

## Files Modified

This system touches these key files:
- `src/data/role-config.yml` - Role definitions
- `src/collections.ts` - TypeScript types and helpers
- `sync-officials.ts` - Sync script using role config
- `public/admin/config.yml` - Decap CMS UI
- `src/pages/government/officials.astro` - Republic officials page
- `src/pages/icenia-city/council.astro` - City council page
