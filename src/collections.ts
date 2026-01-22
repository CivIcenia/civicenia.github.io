/**
 * This file is a barrel that re-exports all collection-related modules.
 * 
 * IMPORTANT: This file was split to fix OOM (Out of Memory) errors during build.
 * 
 * Previously, this was a monolithic file that imported ALL YAML data files
 * at the module level. This caused memory issues because:
 * 1. Astro's Content Collections API loads this file to validate markdown files
 * 2. Each worker thread loads the entire module (including all YAML data)
 * 3. With many workers, this exhausts the 8GB heap limit
 * 
 * UPDATE: Pages and components should now import directly from src/lib/ to 
 * avoid loading unnecessary data. This file now only re-exports schemas.
 */

// Re-export schemas
export {
    CollectionItemSchema,
    NewsItemSchema,
    ActSchema,
    CityActSchema,
    OfficialChangeSchema,
    CityOfficialChangeSchema,
    LawSchema,
    CityLawSchema,
    RoleSlotSchema,
    SenatorSeatSchema,
    CouncillorSeatSchema,
    GovOfficialsSchema,
    CouncillorsDataSchema,
    RoleDefinitionSchema,
    RoleConfigSchema
} from "./schemas";
