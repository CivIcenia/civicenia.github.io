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
 * Now, each namespace is in its own file under src/lib/, so imports only
 * load the data they actually need.
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

// Re-export from individual modules
export { Acts } from "./lib/acts";
export { CityActs } from "./lib/city-acts";
export { Laws, LawIncorporations } from "./lib/laws";
export { CityLaws, CityLawIncorporations } from "./lib/city-laws";
export { GovOfficials, OfficialChanges } from "./lib/officials";
export { Councillors, CityOfficialChanges } from "./lib/councillors";
export { RoleConfig } from "./lib/role-config";
export { ScrapedItems } from "./lib/scraped-items";
