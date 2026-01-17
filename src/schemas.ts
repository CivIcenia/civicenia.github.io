import { z } from "astro:content";

// --- Helpers ---

// Helper to handle empty strings from CMS as undefined
export const emptyStringToUndefined = z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.number().optional()
);

// Helper for optional positive integers (handles empty strings)
export const optionalPositiveInt = z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce.number().int().positive().optional()
);

// --- Base Schemas ---

export const CollectionItemSchema = z.object({
    "layout": z.string()
});

export const NewsItemSchema = CollectionItemSchema.extend({
    "headline": z.string(),
    "date": z.coerce.date(),
    "excerpt": z.string().optional(),
    "icon": z.string()
});

// --- Acts ---

export const ActSchema = NewsItemSchema.extend({
    "layout": z.literal("@layouts/news/act.astro"),
    "changetolaw": z.literal(true),
    "institution": z.enum(["senate", "executive", "referendum", "icenian-signatures"]),
    "document": z.object({
        "type": z.enum(["local-file", "remote-file", "markdown"]),
        "value": z.string()
    }),
    "changes": z.array(z.object({
        "kind": z.enum(["passage", "amendment", "repeal"]),
        "target": z.string()
    }))
});

// --- City Acts ---

export const CityActSchema = NewsItemSchema.extend({
    "layout": z.literal("@layouts/news/city-act.astro"),
    "changetocitylaw": z.literal(true),
    "institution": z.enum(["council", "mayor", "referendum", "federal"]),
    "term_number": z.number().int().positive().optional(),
    "act_number": z.number().int().positive().optional(),
    "document": z.object({
        "type": z.enum(["local-file", "remote-file", "markdown"]),
        "value": z.string()
    }),
    "changes": z.array(z.object({
        "kind": z.enum(["passage", "amendment", "repeal"]),
        "target": z.string()
    }))
});

// --- Official Changes ---

export const OfficialChangeSchema = NewsItemSchema.extend({
    "layout": z.literal("@layouts/news/official-change.astro"),
    "officialchange": z.literal(true),
    "changetype": z.enum([
        "senate-election",
        "senate-byelection",
        "secretary-change",
        "speaker-vote",
        "president-change",
        "executive-change"
    ]),
    "term": optionalPositiveInt,
    "senate_size": optionalPositiveInt,
    "officials": z.array(z.object({
        "name": z.string(),
        "role": z.string(),
        "action": z.enum(["elected", "reelected", "appointed", "resigned", "removed", "succeeded"]),
        "icon": z.string().optional(),
        "seat": emptyStringToUndefined
    }))
});

// --- City Official Changes ---

export const CityOfficialChangeSchema = NewsItemSchema.extend({
    "layout": z.literal("@layouts/news/city-official-change.astro"),
    "cityofficialchange": z.literal(true),
    "changetype": z.enum([
        "council-election",
        "council-byelection",
        "mayor-vote",
        "other-appointments"
    ]),
    "term": optionalPositiveInt,
    "council_size": optionalPositiveInt,
    "officials": z.array(z.object({
        "name": z.string(),
        "role": z.union([z.string(), z.array(z.string())]),
        "action": z.enum(["elected", "reelected", "appointed", "resigned", "removed", "succeeded"]),
        "icon": z.string().optional(),
        "seat": emptyStringToUndefined
    }))
});

// --- Laws ---

export const LawSchema = z.object({
    "slug": z.string(),
    "name": z.string(),
    "fullname": z.string().optional(),
    "kind": z.enum(["constitution", "statute", "statehood", "treaty"]),
    "masterdoc": z.string(),
    "hidden": z.boolean(),
});

export const CityLawSchema = z.object({
    "slug": z.string(),
    "name": z.string(),
    "fullname": z.string().optional(),
    "kind": z.enum(["charter", "ordinance"]),
    "masterdoc": z.string(),
    "hidden": z.boolean(),
});

// --- Officials & Councillors ---

export const RoleSlotSchema = z.object({
    "name": z.string(),
    "icon": z.string().optional(),
});

export const SenatorSeatSchema = z.object({
    "seat": z.number(),
    "name": z.string(),
    "icon": z.string().optional(),
});

export const CouncillorSeatSchema = z.object({
    "seat": z.number(),
    "name": z.string(),
    "icon": z.string().optional(),
});

export const GovOfficialsSchema = z.object({
    "senate_term": z.string(),
    "president": RoleSlotSchema,
    "secretary_of_defense": RoleSlotSchema,
    "secretary_of_interior": RoleSlotSchema,
    "secretary_of_treasury": RoleSlotSchema,
    "speaker": RoleSlotSchema,
    "senators": z.array(SenatorSeatSchema),
}).passthrough();

export const CouncillorsDataSchema = z.object({
    "council_term": z.string(),
    "mayor": RoleSlotSchema,
    "councillors": z.array(CouncillorSeatSchema),
}).passthrough();

// --- Role Config ---

export const RoleDefinitionSchema = z.object({
    "id": z.string(),
    "display_name": z.string(),
    "multi_seat": z.boolean(),
    "num_seats": z.number().optional(),
    "section": z.string().optional(),
    "order": z.number(),
});

export const RoleConfigSchema = z.object({
    "republic_roles": z.array(RoleDefinitionSchema),
    "city_roles": z.array(RoleDefinitionSchema),
});

// --- Inferred Types ---

export type Act = z.infer<typeof ActSchema>;
export type CityAct = z.infer<typeof CityActSchema>;
export type OfficialChange = z.infer<typeof OfficialChangeSchema>;
export type CityOfficialChange = z.infer<typeof CityOfficialChangeSchema>;
export type Law = z.infer<typeof LawSchema>;
export type CityLaw = z.infer<typeof CityLawSchema>;
export type RoleSlot = z.infer<typeof RoleSlotSchema>;
export type SenatorSeat = z.infer<typeof SenatorSeatSchema>;
export type CouncillorSeat = z.infer<typeof CouncillorSeatSchema>;
export type OfficialsData = z.infer<typeof GovOfficialsSchema>;
export type CouncillorsData = z.infer<typeof CouncillorsDataSchema>;
export type RoleDefinition = z.infer<typeof RoleDefinitionSchema>;
export type RoleConfigData = z.infer<typeof RoleConfigSchema>;