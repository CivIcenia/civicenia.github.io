# Role Management System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ROLE MANAGEMENT SYSTEM                        │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│  1. CONFIGURATION LAYER                                              │
│  ───────────────────────                                             │
│                                                                       │
│  ┌────────────────────────────────────────────┐                     │
│  │  src/data/role-config.yml                  │                     │
│  │  ────────────────────────                  │                     │
│  │  republic_roles:                           │                     │
│  │    - id: president                         │                     │
│  │      display_name: President               │                     │
│  │      multi_seat: false                     │                     │
│  │      order: 1                              │                     │
│  │                                            │                     │
│  │    - id: senator                           │                     │
│  │      display_name: Senator                 │                     │
│  │      multi_seat: true                      │                     │
│  │      num_seats: 5                          │                     │
│  │      order: 6                              │                     │
│  │                                            │                     │
│  │  city_roles:                               │                     │
│  │    - id: mayor                             │                     │
│  │      ...                                   │                     │
│  └────────────────────────────────────────────┘                     │
│                           │                                           │
│                           │ Read by                                   │
│                           ▼                                           │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│  2. TYPESCRIPT LAYER                                                  │
│  ─────────────────                                                    │
│                                                                       │
│  ┌────────────────────────────────────────────┐                     │
│  │  src/collections.ts                        │                     │
│  │  ──────────────────                        │                     │
│  │  export namespace RoleConfig {             │                     │
│  │    getRoleConfig()                         │                     │
│  │    getRepublicRoles()                      │                     │
│  │    getCityRoles()                          │                     │
│  │    getRoleById()                           │                     │
│  │  }                                         │                     │
│  └────────────────────────────────────────────┘                     │
│                           │                                           │
│                           │ Used by                                   │
│                           ▼                                           │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│  3. SYNC LAYER                                                        │
│  ───────────────                                                      │
│                                                                       │
│  ┌────────────────────────────────────────────┐                     │
│  │  sync-officials.ts                         │                     │
│  │  ─────────────────                         │                     │
│  │  1. Load role config                       │                     │
│  │  2. Read official change posts             │                     │
│  │  3. Build officials.yml/councillors.yml    │                     │
│  │     based on:                              │                     │
│  │     - Configured roles                     │                     │
│  │     - Number of seats                      │                     │
│  │     - Latest appointments                  │                     │
│  └────────────────────────────────────────────┘                     │
│                           │                                           │
│                           │ Generates                                 │
│                           ▼                                           │
│  ┌──────────────────────┐  ┌──────────────────────┐                 │
│  │ src/data/            │  │ src/data/            │                 │
│  │ officials.yml        │  │ councillors.yml      │                 │
│  │                      │  │                      │                 │
│  │ senate_term: ...     │  │ council_term: ...    │                 │
│  │ president:           │  │ mayor:               │                 │
│  │   name: ...          │  │   name: ...          │                 │
│  │   icon: ...          │  │   icon: ...          │                 │
│  │ secretary_...: ...   │  │ councillors:         │                 │
│  │ senators:            │  │   - seat: 1          │                 │
│  │   - seat: 1          │  │     name: ...        │                 │
│  │     name: ...        │  │   - seat: 2          │                 │
│  │     icon: ...        │  │     ...              │                 │
│  └──────────────────────┘  └──────────────────────┘                 │
│                           │                                           │
│                           │ Read by                                   │
│                           ▼                                           │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│  4. DISPLAY LAYER                                                     │
│  ──────────────                                                       │
│                                                                       │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐   │
│  │ src/pages/government/       │  │ src/pages/icenia-city/      │   │
│  │ officials.astro             │  │ council.astro               │   │
│  │                             │  │                             │   │
│  │ 1. Load role config         │  │ 1. Load role config         │   │
│  │ 2. Load officials data      │  │ 2. Load councillors data    │   │
│  │ 3. Render dynamically:      │  │ 3. Render dynamically:      │   │
│  │    - Executive roles        │  │    - All city roles         │   │
│  │    - Legislative roles      │  │    - In configured order    │   │
│  │    - Multi-seat w/ numbers  │  │    - Multi-seat w/ numbers  │   │
│  └─────────────────────────────┘  └─────────────────────────────┘   │
│                           │                                           │
│                           │ Renders to                                │
│                           ▼                                           │
│  ┌────────────────────────────────────────────┐                     │
│  │  Website Pages                             │                     │
│  │  /government/officials                     │                     │
│  │  /icenia-city/council                      │                     │
│  └────────────────────────────────────────────┘                     │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│  5. ADMIN INTERFACE                                                   │
│  ────────────────                                                     │
│                                                                       │
│  ┌────────────────────────────────────────────┐                     │
│  │  public/admin/config.yml                   │                     │
│  │  ───────────────────────                   │                     │
│  │  - label: "Role Configuration"             │                     │
│  │    name: "role-config"                     │                     │
│  │    file: "src/data/role-config.yml"        │                     │
│  │    fields:                                 │                     │
│  │      - republic_roles (list)               │                     │
│  │      - city_roles (list)                   │                     │
│  └────────────────────────────────────────────┘                     │
│                           │                                           │
│                           │ Powers                                    │
│                           ▼                                           │
│  ┌────────────────────────────────────────────┐                     │
│  │  Decap CMS UI                              │                     │
│  │  http://localhost:4000/admin               │                     │
│  │                                            │                     │
│  │  Data → Role Configuration                 │                     │
│  │  - Add/Remove roles                        │                     │
│  │  - Edit role properties                    │                     │
│  │  - Change seat numbers                     │                     │
│  │  - Reorder roles                           │                     │
│  └────────────────────────────────────────────┘                     │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│  WORKFLOW                                                             │
│  ────────                                                             │
│                                                                       │
│  User Action          →    System Response                           │
│  ───────────────────       ──────────────────                        │
│                                                                       │
│  1. Add new role      →    Edit role-config.yml via admin or file    │
│     (e.g., VP)             - Add role definition                     │
│                            - Set properties (single/multi-seat)      │
│                                                                       │
│  2. Change seats      →    Edit num_seats in role-config.yml         │
│     (e.g., 5→7)            - Update the specific role                │
│                                                                       │
│  3. Run sync          →    bun run sync-officials.ts                 │
│                            - Reads role-config.yml                   │
│                            - Reads official change posts             │
│                            - Generates new YAML files                │
│                                                                       │
│  4. Build site        →    bun run build                             │
│                            - Runs sync automatically                 │
│                            - TypeScript reads configs                │
│                            - Astro renders pages                     │
│                                                                       │
│  5. View result       →    Website displays updated roles            │
│                            - Dynamic rendering                       │
│                            - Correct seat numbers                    │
│                            - Proper ordering                         │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│  KEY FEATURES                                                         │
│  ────────────                                                         │
│                                                                       │
│  ✅ Single Source of Truth: role-config.yml defines all roles        │
│  ✅ Type-Safe: TypeScript ensures data integrity                     │
│  ✅ Automatic Sync: Official changes update YAML automatically       │
│  ✅ Dynamic Display: Pages render based on configuration             │
│  ✅ Admin-Friendly: Decap CMS provides UI for non-technical users    │
│  ✅ Flexible: Easy to add/remove roles or change seat counts         │
│  ✅ Maintainable: Clear separation of concerns                       │
└──────────────────────────────────────────────────────────────────────┘
```
