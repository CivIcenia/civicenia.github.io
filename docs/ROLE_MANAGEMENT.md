# Role Management System

This document explains the new dynamic role management system for city and republic officials.

## Overview

The role management system allows you to:
- **Add or remove roles** for both city and republic officials
- **Configure multi-seat roles** (like senators or councillors with numbered seats)
- **Define the number of seats** for multi-seat roles
- **Control display order** of roles on official pages

## Configuration File

Roles are configured in [`src/data/role-config.yml`](../src/data/role-config.yml).

### Structure

```yaml
republic_roles:
  - id: "president"                    # Unique ID (snake_case)
    display_name: "President"          # Display name on website
    multi_seat: false                  # Single seat role
    order: 1                           # Display order (lower = first)
  
  - id: "senator"
    display_name: "Senator"
    multi_seat: true                   # Multi-seat role
    num_seats: 5                       # Number of seats
    order: 6

city_roles:
  - id: "mayor"
    display_name: "Mayor"
    multi_seat: false
    order: 1
  
  - id: "councillor"
    display_name: "Councillor"
    multi_seat: true
    num_seats: 5
    order: 2
```

## Managing Roles via Admin Panel

1. Start the admin server:
   ```powershell
   bun run admin.ts
   ```

2. Open http://localhost:4000/admin/index.html

3. Navigate to **Data** → **Role Configuration**

4. Here you can:
   - **Add new roles** using the "Add Republic Role" or "Add City Role" buttons
   - **Edit existing roles** by clicking on them
   - **Remove roles** by clicking the delete button
   - **Change role properties**:
     - Role ID (must be unique, lowercase with underscores)
     - Display Name (shown on the website)
     - Has Multiple Seats? (toggle for multi-seat roles)
     - Number of Seats (only for multi-seat roles)
     - Display Order (controls appearance order on pages)

5. Save your changes

## Adding a New Role

### Example: Adding a "Vice President" Role

1. Via Admin Panel:
   - Go to Data → Role Configuration
   - Click "Add Republic Role"
   - Set:
     - Role ID: `vice_president`
     - Display Name: `Vice President`
     - Has Multiple Seats?: OFF
     - Display Order: `2` (to appear after President)
   - Save

2. Via File Edit (alternative):
   - Edit `src/data/role-config.yml`
   - Add under `republic_roles`:
     ```yaml
     - id: "vice_president"
       display_name: "Vice President"
       multi_seat: false
       order: 2
     ```

3. The role will automatically:
   - Appear on the Officials page
   - Be syncable via official change posts
   - Be editable via Decap CMS

## Changing the Number of Seats

### Example: Expanding Senate from 5 to 7 seats

1. Via Admin Panel:
   - Go to Data → Role Configuration
   - Find the "Senator" role under Republic Roles
   - Change "Number of Seats" from `5` to `7`
   - Save

2. Via File Edit:
   ```yaml
   - id: "senator"
     display_name: "Senator"
     multi_seat: true
     num_seats: 7  # Changed from 5
     order: 6
   ```

3. Run the sync script to update officials.yml:
   ```powershell
   bun run sync-officials.ts
   ```

The officials page will now display 7 senate seats instead of 5.

## Removing a Role

1. Via Admin Panel:
   - Go to Data → Role Configuration
   - Find the role you want to remove
   - Click the delete/trash icon
   - Save

2. Via File Edit:
   - Remove the role entry from `role-config.yml`

**Note**: Removing a role won't delete existing official data immediately. Run `bun run sync-officials.ts` to clean up the officials.yml file.

## How It Works

### 1. Role Configuration (`role-config.yml`)
Defines what roles exist and their properties.

### 2. Collections (`src/collections.ts`)
The `RoleConfig` namespace reads the configuration and provides TypeScript types and helpers.

### 3. Sync Script (`sync-officials.ts`)
Reads role configuration and rebuilds `officials.yml` and `councillors.yml` based on:
- Current role definitions
- Latest official change posts
- Configured number of seats for multi-seat roles

### 4. Display Pages
- `src/pages/government/officials.astro` - Republic officials
- `src/pages/icenia-city/council.astro` - City officials

Both pages dynamically render roles based on role-config.yml.

### 5. Admin Panel (`public/admin/config.yml`)
Provides UI for managing role configuration through Decap CMS.

## Official Change Posts

When creating official change posts, use the role ID (kebab-case version) for the `role` field:

```yaml
officials:
  - name: "ChrisChrispie"
    role: "president"          # Maps to role ID "president"
    action: "elected"
  - name: "Anvil"
    role: "senator"            # Maps to role ID "senator"
    seat: 1                    # Required for multi-seat roles
    action: "elected"
```

Role mappings in `sync-officials.ts`:
- `GOV_ROLE_MAP` - Maps kebab-case from posts → snake_case for YAML
- `CITY_ROLE_MAP` - Same for city roles

## Building and Deployment

After making changes to role configuration:

1. Run the sync script:
   ```powershell
   bun run sync-officials.ts
   ```

2. Build the site:
   ```powershell
   bun run build
   ```

3. Commit and push to deploy

## Tips

- **Role IDs** must be unique and use snake_case (e.g., `secretary_of_defense`)
- **Display Order** controls appearance - lower numbers appear first
- **Multi-seat roles** require seat numbers in official change posts
- The sync script runs automatically during build
- Changes to role config require rebuilding the site

## Troubleshooting

**Roles not appearing on the page:**
- Check that the role ID in `role-config.yml` matches the keys in `officials.yml` or `councillors.yml`
- Run `bun run sync-officials.ts` to regenerate the YAML files
- Check browser console for errors

**Seat numbers not working:**
- Ensure `multi_seat: true` is set for the role
- Ensure `num_seats` is specified
- Official change posts must include `seat:` field for multi-seat roles

**Role mapping errors:**
- Check that `GOV_ROLE_MAP` or `CITY_ROLE_MAP` in `sync-officials.ts` includes the kebab-case version of your role ID
