import { type MarkdownLayoutProps } from "astro";
import { z, getCollection } from "astro:content";
import { Arrays } from "@helpers";

export const CollectionItemSchema = z.object({
    "layout": z.string()
});

export const NewsItemSchema = CollectionItemSchema.extend({
    "headline": z.string(),
    "date": z.coerce.date(),
    "excerpt": z.string().optional(),
    "icon": z.string()
});

// Helper to handle empty strings from CMS as undefined
const emptyStringToUndefined = z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.number().optional()
);

// Helper for optional positive integers (handles empty strings)
const optionalPositiveInt = z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce.number().int().positive().optional()
);

// ############################################################
// Acts
// ############################################################

export namespace Acts {
    export const Schema = NewsItemSchema.extend({
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
    export type Act = z.infer<typeof Schema>;

    export function isAct(
        frontmatter: any
    ) {
        return frontmatter["changetolaw"] === true;
    }

    export function ensureAct(
        frontmatter: MarkdownLayoutProps<Act>["frontmatter"]
    ): Act {
        frontmatter.changes ??= [];
        return frontmatter;
    }

    /**
     * Retrieves all acts sorted from newest to oldest.
     */
    export async function getActs() {
        return (await getCollection("news"))
            .filter((entry) => isAct(entry.data))
            .sort(Arrays.sortByDate((entry) => entry.data.date))
            .reverse();
    }
}

// ############################################################
// Laws
// ############################################################

import LawsData from "./data/laws.yml";
import LawIncorporationsData from "./data/law-incorporations.yml";

// ############################################################
// Law Incorporations (Tracking when changes are incorporated)
// ############################################################

export namespace LawIncorporations {
    // Schema supports both old format (change_slug: string) and new format (change_slugs: string[])
    export type Incorporation = {
        change_slugs: string[];  // Always normalized to array
        law_slug: string;
        incorporated_at: Date;
        incorporated_by: string;
        notes?: string;
    };
    
    // Internal schema for parsing raw data
    const RawSchema = z.object({
        "change_slug": z.string().optional(),  // Old format (single)
        "change_slugs": z.array(z.string()).optional(),  // New format (array)
        "law_slug": z.string(),
        "incorporated_at": z.coerce.date(),
        "incorporated_by": z.string(),
        "notes": z.string().optional(),
    });

    export function getIncorporations(): Incorporation[] {
        return (LawIncorporationsData["incorporations"] || [])
            .map((inc: unknown) => RawSchema.safeParse(inc))
            .filter((parsed: { success: boolean }) => parsed.success)
            .map((parsed: { data: z.infer<typeof RawSchema> }) => {
                const data = parsed["data"];
                // Normalize: support both old single slug and new array format
                let changeSlugs: string[] = [];
                if (data.change_slugs && data.change_slugs.length > 0) {
                    changeSlugs = data.change_slugs;
                } else if (data.change_slug) {
                    changeSlugs = [data.change_slug];
                }
                return {
                    change_slugs: changeSlugs,
                    law_slug: data.law_slug,
                    incorporated_at: data.incorporated_at,
                    incorporated_by: data.incorporated_by,
                    notes: data.notes,
                };
            });
    }

    export function isChangeIncorporated(changeSlug: string, lawSlug: string): boolean {
        return getIncorporations().some(
            (inc) => inc.change_slugs.includes(changeSlug) && inc.law_slug === lawSlug
        );
    }

    export function getIncorporationForChange(changeSlug: string, lawSlug: string): Incorporation | undefined {
        return getIncorporations().find(
            (inc) => inc.change_slugs.includes(changeSlug) && inc.law_slug === lawSlug
        );
    }

    export function getIncorporationsForLaw(lawSlug: string): Incorporation[] {
        return getIncorporations()
            .filter((inc) => inc.law_slug === lawSlug)
            .sort((a, b) => b.incorporated_at.getTime() - a.incorporated_at.getTime());
    }
}

export namespace Laws {
    export type Law = z.infer<typeof Schema>;
    export const Schema = z.object({
        "slug": z.string(),
        "name": z.string(),
        "fullname": z.string().optional(),
        "kind": z.enum(["constitution", "statute", "statehood", "treaty"]),
        "masterdoc": z.string(),
        "hidden": z.boolean(),
    });

    export async function getLaws(): Promise<Law[]> {
        return LawsData["entries"]
            .map((law) => Schema.safeParse(law))
            .filter((parsed) => parsed.success)
            .map((parsed) => parsed["data"]);
    }

    export function getFullTitle(
        law: Law
    ): string {
        return law.fullname || law.name;
    }

    export type ChangerInfo = {
        kind: "passage" | "amendment" | "repeal";
        target: string;
        act: Awaited<ReturnType<typeof Acts.getActs>>[number];
        incorporated: boolean;
        incorporation?: LawIncorporations.Incorporation;
    };

    export async function getChanges(
        law: Law
    ): Promise<ChangerInfo[]> {
        return (await Acts.getActs())
            .flatMap((act) => {
                const data = act.data as Acts.Act;
                return data.changes.map((change) => {
                    const incorporated = LawIncorporations.isChangeIncorporated(act.slug, law.slug);
                    return {
                        kind: change.kind,
                        target: change.target,
                        act,
                        incorporated,
                        incorporation: incorporated 
                            ? LawIncorporations.getIncorporationForChange(act.slug, law.slug) 
                            : undefined
                    };
                });
            })
            .filter((changer) => changer.target === law.slug);
    }

    export async function getPendingChanges(law: Law): Promise<ChangerInfo[]> {
        const changers = await getChanges(law);
        // Only amendments need incorporation (passages are the initial enactment, repeals are handled separately)
        return changers.filter((c) => !c.incorporated && c.kind === "amendment");
    }

    export async function hasPendingChanges(law: Law): Promise<boolean> {
        return (await getPendingChanges(law)).length > 0;
    }
}

// ############################################################
// City Laws
// ############################################################

import CityLawsData from "./data/city-laws.yml";
import CityLawIncorporationsData from "./data/city-law-incorporations.yml";

// ############################################################
// City Law Incorporations (Tracking when city law changes are incorporated)
// ############################################################

export namespace CityLawIncorporations {
    // Schema supports both old format (change_slug: string) and new format (change_slugs: string[])
    export type Incorporation = {
        change_slugs: string[];  // Always normalized to array
        law_slug: string;
        incorporated_at: Date;
        incorporated_by: string;
        notes?: string;
    };
    
    // Internal schema for parsing raw data
    const RawSchema = z.object({
        "change_slug": z.string().optional(),  // Old format (single)
        "change_slugs": z.array(z.string()).optional(),  // New format (array)
        "law_slug": z.string(),
        "incorporated_at": z.coerce.date(),
        "incorporated_by": z.string(),
        "notes": z.string().optional(),
    });

    export function getIncorporations(): Incorporation[] {
        return (CityLawIncorporationsData["incorporations"] || [])
            .map((inc: unknown) => RawSchema.safeParse(inc))
            .filter((parsed: { success: boolean }) => parsed.success)
            .map((parsed: { data: z.infer<typeof RawSchema> }) => {
                const data = parsed["data"];
                // Normalize: support both old single slug and new array format
                let changeSlugs: string[] = [];
                if (data.change_slugs && data.change_slugs.length > 0) {
                    changeSlugs = data.change_slugs;
                } else if (data.change_slug) {
                    changeSlugs = [data.change_slug];
                }
                return {
                    change_slugs: changeSlugs,
                    law_slug: data.law_slug,
                    incorporated_at: data.incorporated_at,
                    incorporated_by: data.incorporated_by,
                    notes: data.notes,
                };
            });
    }

    export function isChangeIncorporated(changeSlug: string, lawSlug: string): boolean {
        return getIncorporations().some(
            (inc) => inc.change_slugs.includes(changeSlug) && inc.law_slug === lawSlug
        );
    }

    export function getIncorporationForChange(changeSlug: string, lawSlug: string): Incorporation | undefined {
        return getIncorporations().find(
            (inc) => inc.change_slugs.includes(changeSlug) && inc.law_slug === lawSlug
        );
    }

    export function getIncorporationsForLaw(lawSlug: string): Incorporation[] {
        return getIncorporations()
            .filter((inc) => inc.law_slug === lawSlug)
            .sort((a, b) => b.incorporated_at.getTime() - a.incorporated_at.getTime());
    }
}

export namespace CityLaws {
    export type CityLaw = z.infer<typeof Schema>;
    export const Schema = z.object({
        "slug": z.string(),
        "name": z.string(),
        "fullname": z.string().optional(),
        "kind": z.enum(["charter", "ordinance"]),
        "masterdoc": z.string(),
        "hidden": z.boolean(),
    });

    export async function getCityLaws(): Promise<CityLaw[]> {
        return (CityLawsData["entries"] || [])
            .map((law) => Schema.safeParse(law))
            .filter((parsed) => parsed.success)
            .map((parsed) => parsed["data"]);
    }

    export function getFullTitle(
        law: CityLaw
    ): string {
        return law.fullname || law.name;
    }

    export type ChangerInfo = {
        kind: "passage" | "amendment" | "repeal";
        target: string;
        act: Awaited<ReturnType<typeof CityActs.getCityActs>>[number];
        incorporated: boolean;
        incorporation?: CityLawIncorporations.Incorporation;
    };

    export async function getChanges(
        law: CityLaw
    ): Promise<ChangerInfo[]> {
        return (await CityActs.getCityActs())
            .flatMap((act) => {
                const data = act.data as CityActs.CityAct;
                return data.changes.map((change) => {
                    const incorporated = CityLawIncorporations.isChangeIncorporated(act.slug, law.slug);
                    return {
                        kind: change.kind,
                        target: change.target,
                        act,
                        incorporated,
                        incorporation: incorporated 
                            ? CityLawIncorporations.getIncorporationForChange(act.slug, law.slug) 
                            : undefined
                    };
                });
            })
            .filter((changer) => changer.target === law.slug);
    }

    export async function getPendingChanges(law: CityLaw): Promise<ChangerInfo[]> {
        const changers = await getChanges(law);
        // Only amendments need incorporation (passages are the initial enactment, repeals are handled separately)
        return changers.filter((c) => !c.incorporated && c.kind === "amendment");
    }

    export async function hasPendingChanges(law: CityLaw): Promise<boolean> {
        return (await getPendingChanges(law)).length > 0;
    }
}

// ############################################################
// City Acts (Changes to City Law)
// ############################################################

export namespace CityActs {
    export const Schema = NewsItemSchema.extend({
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
    export type CityAct = z.infer<typeof Schema>;

    export function isCityAct(
        frontmatter: any
    ) {
        return frontmatter["changetocitylaw"] === true;
    }

    export function ensureCityAct(
        frontmatter: MarkdownLayoutProps<CityAct>["frontmatter"]
    ): CityAct {
        frontmatter.changes ??= [];
        return frontmatter;
    }

    /**
     * Retrieves all city acts sorted from newest to oldest.
     */
    export async function getCityActs() {
        return (await getCollection("city-news"))
            .filter((entry) => isCityAct(entry.data))
            .sort(Arrays.sortByDate((entry) => entry.data.date))
            .reverse();
    }
    
    /**
     * Formats the act number for display (e.g., "01-05" or empty if not set)
     */
    export function formatActNumber(act: CityAct): string {
        if (act.term_number && act.act_number) {
            const term = act.term_number.toString().padStart(2, '0');
            const num = act.act_number.toString().padStart(2, '0');
            return `${term}-${num}`;
        }
        return '';
    }
}

// ############################################################
// Government Officials
// ############################################################

import OfficialsData from "./data/officials.yml";
export namespace GovOfficials {
    // Schema for a role slot (name + discord icon)
    export type RoleSlot = z.infer<typeof RoleSlotSchema>;
    export const RoleSlotSchema = z.object({
        "name": z.string(),
        "icon": z.string().optional(),
    });

    // Schema for a senator seat
    export type SenatorSeat = z.infer<typeof SenatorSeatSchema>;
    export const SenatorSeatSchema = z.object({
        "seat": z.number(),
        "name": z.string(),
        "icon": z.string().optional(),
    });

    export type OfficialsData = z.infer<typeof Schema>;
    export const Schema = z.object({
        "senate_term": z.string(),
        "president": RoleSlotSchema,
        "secretary_of_defense": RoleSlotSchema,
        "secretary_of_interior": RoleSlotSchema,
        "secretary_of_treasury": RoleSlotSchema,
        "speaker": RoleSlotSchema,
        "senators": z.array(SenatorSeatSchema),
    }).passthrough(); // Allow additional role fields from role-config.yml

    const defaultSlot: RoleSlot = { name: "", icon: "https://cdn.discordapp.com/embed/avatars/0.png" };

    export function getOfficials(): OfficialsData {
        const parsed = Schema.safeParse(OfficialsData);
        if (parsed.success) {
            return parsed.data;
        }
        // Return defaults if parsing fails
        return {
            senate_term: "Current Term",
            president: defaultSlot,
            secretary_of_defense: defaultSlot,
            secretary_of_interior: defaultSlot,
            secretary_of_treasury: defaultSlot,
            speaker: defaultSlot,
            senators: []
        };
    }

    export function getPresident(): RoleSlot {
        return getOfficials().president;
    }

    export function getSecretaries(): { title: string; slot: RoleSlot }[] {
        const data = getOfficials();
        return [
            { title: "Secretary of Defense", slot: data.secretary_of_defense },
            { title: "Secretary of Interior", slot: data.secretary_of_interior },
            { title: "Secretary of Treasury", slot: data.secretary_of_treasury },
        ].filter(s => s.slot.name !== "");
    }

    export function getSpeaker(): RoleSlot {
        return getOfficials().speaker;
    }

    export function getSenators(): SenatorSeat[] {
        return getOfficials().senators;
    }

    export function getSenateTerm(): string {
        return getOfficials().senate_term;
    }
}

// ############################################################
// City Councillors
// ############################################################

import CouncillorsData from "./data/councillors.yml";
export namespace Councillors {
    // Schema for a role slot (name + discord icon)
    export type RoleSlot = z.infer<typeof RoleSlotSchema>;
    export const RoleSlotSchema = z.object({
        "name": z.string(),
        "icon": z.string().optional(),
    });

    // Schema for a councillor seat
    export type CouncillorSeat = z.infer<typeof CouncillorSeatSchema>;
    export const CouncillorSeatSchema = z.object({
        "seat": z.number(),
        "name": z.string(),
        "icon": z.string().optional(),
    });

    export type CouncillorsData = z.infer<typeof Schema>;
    export const Schema = z.object({
        "council_term": z.string(),
        "mayor": RoleSlotSchema,
        "councillors": z.array(CouncillorSeatSchema),
    }).passthrough(); // Allow additional role fields from role-config.yml

    const defaultSlot: RoleSlot = { name: "", icon: "https://cdn.discordapp.com/embed/avatars/0.png" };

    export function getCouncillors(): CouncillorsData {
        const parsed = Schema.safeParse(CouncillorsData);
        if (parsed.success) {
            return parsed.data;
        }
        // Return defaults if parsing fails
        return {
            council_term: "Current Term",
            mayor: defaultSlot,
            councillors: []
        };
    }

    export function getMayor(): RoleSlot {
        return getCouncillors().mayor;
    }

    export function getCouncillorSeats(): CouncillorSeat[] {
        return getCouncillors().councillors;
    }

    export function getCouncilTerm(): string {
        return getCouncillors().council_term;
    }
}

// ############################################################
// Official Changes (News) - Government
// ############################################################

export namespace OfficialChanges {
    export const Schema = NewsItemSchema.extend({
        "layout": z.literal("@layouts/news/official-change.astro"),
        "officialchange": z.literal(true),
        "changetype": z.enum([
            "senate-election",
            "senate-byelection",
            "secretary-change",
            "speaker-vote",
            "president-change"
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
    export type OfficialChange = z.infer<typeof Schema>;

    export function isOfficialChange(
        frontmatter: any
    ) {
        return frontmatter["officialchange"] === true;
    }

    export function ensureOfficialChange(
        frontmatter: MarkdownLayoutProps<OfficialChange>["frontmatter"]
    ): OfficialChange {
        frontmatter.officials ??= [];
        return frontmatter;
    }

    /**
     * Retrieves all official changes sorted from newest to oldest.
     */
    export async function getOfficialChanges() {
        return (await getCollection("news"))
            .filter((entry) => isOfficialChange(entry.data))
            .sort(Arrays.sortByDate((entry) => entry.data.date))
            .reverse();
    }
}

// ############################################################
// City Official Changes (News)
// ############################################################

export namespace CityOfficialChanges {
    export const Schema = NewsItemSchema.extend({
        "layout": z.literal("@layouts/news/city-official-change.astro"),
        "cityofficialchange": z.literal(true),
        "changetype": z.enum([
            "council-election",
            "council-byelection",
            "mayor-vote",
            "other-appointments"
        ]),
        "term": optionalPositiveInt,
        "officials": z.array(z.object({
            "name": z.string(),
            "role": z.union([z.string(), z.array(z.string())]),
            "action": z.enum(["elected", "reelected", "appointed", "resigned", "removed", "succeeded"]),
            "icon": z.string().optional(),
            "seat": emptyStringToUndefined
        }))
    });
    export type CityOfficialChange = z.infer<typeof Schema>;

    export function isCityOfficialChange(
        frontmatter: any
    ) {
        return frontmatter["cityofficialchange"] === true;
    }

    export function ensureCityOfficialChange(
        frontmatter: MarkdownLayoutProps<CityOfficialChange>["frontmatter"]
    ): CityOfficialChange {
        frontmatter.officials ??= [];
        return frontmatter;
    }

    /**
     * Retrieves all city official changes sorted from newest to oldest.
     */
    export async function getCityOfficialChanges() {
        return (await getCollection("city-news"))
            .filter((entry) => isCityOfficialChange(entry.data))
            .sort(Arrays.sortByDate((entry) => entry.data.date))
            .reverse();
    }
}

// ############################################################
// Role Configuration
// ############################################################

import RoleConfigData from "./data/role-config.yml";
export namespace RoleConfig {
    // Schema for a role definition
    export type RoleDefinition = z.infer<typeof RoleDefinitionSchema>;
    export const RoleDefinitionSchema = z.object({
        "id": z.string(),
        "display_name": z.string(),
        "multi_seat": z.boolean(),
        "num_seats": z.number().optional(),
        "section": z.string().optional(),
        "order": z.number(),
    });

    export type RoleConfigData = z.infer<typeof Schema>;
    export const Schema = z.object({
        "republic_roles": z.array(RoleDefinitionSchema),
        "city_roles": z.array(RoleDefinitionSchema),
    });

    export function getRoleConfig(): RoleConfigData {
        const parsed = Schema.safeParse(RoleConfigData);
        if (parsed.success) {
            return parsed.data;
        }
        // Return defaults if parsing fails
        return {
            republic_roles: [],
            city_roles: []
        };
    }

    export function getRepublicRoles(): RoleDefinition[] {
        return getRoleConfig().republic_roles.sort((a, b) => a.order - b.order);
    }

    export function getCityRoles(): RoleDefinition[] {
        return getRoleConfig().city_roles.sort((a, b) => a.order - b.order);
    }

    export function getRoleById(roleId: string, isCity: boolean = false): RoleDefinition | undefined {
        const roles = isCity ? getCityRoles() : getRepublicRoles();
        return roles.find(r => r.id === roleId);
    }
}
