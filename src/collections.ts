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

// ############################################################
// Elections
// ############################################################

export namespace Elections {
    export type Election = z.infer<typeof Schema>;
    export const Schema = NewsItemSchema.extend({
        "layout": z.literal("@layouts/news/election.astro"),
        "election": z.literal(true),
        "term": z.coerce.number().int().positive(),
        "parties": z.array(z.object({
            "name": z.string(),
            "bgcolour": z.string(),
            "txtcolour": z.string(),
            "members": z.array(z.string()).optional().default([]),
            "exmembers": z.array(z.string()).optional().default([])
        }))
    });

    export function isElection(
        frontmatter: any
    ) {
        return frontmatter["election"] === true;
    }

    export function ensureElection(
        frontmatter: MarkdownLayoutProps<Election>["frontmatter"]
    ): Election {
        frontmatter.parties ??= [];
        for (const party of frontmatter.parties) {
            party.members ??= [];
            party.exmembers ??= [];
        }
        return frontmatter;
    }

    /**
     * Retrieves all terms sorted from newest to oldest.
     */
    export async function getElections() {
        return (await getCollection("news"))
            .filter((entry) => isElection(entry.data))
            .sort(Arrays.sortByDate((entry) => entry.data.date))
            .reverse();
    }
}

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
export namespace Laws {
    export type Law = z.infer<typeof Schema>;
    export const Schema = z.object({
        "slug": z.string(),
        "name": z.string(),
        "fullname": z.string().optional(),
        "kind": z.enum(["constitution", "statute", "statehood", "treaty"]),
        "googledoc": z.string(),
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

    export async function getChangers(
        law: Law
    ) {
        return (await Acts.getActs())
            .flatMap((act) => {
                const data = act.data as Acts.Act;
                return data.changes.map((change) => ({
                    kind: change.kind,
                    target: change.target,
                    act
                }));
            })
            .filter((changer) => changer.target === law.slug);
    }
}

// ############################################################
// City Laws
// ############################################################

import CityLawsData from "./data/city-laws.yml";
export namespace CityLaws {
    export type CityLaw = z.infer<typeof Schema>;
    export const Schema = z.object({
        "slug": z.string(),
        "name": z.string(),
        "fullname": z.string().optional(),
        "kind": z.enum(["charter", "ordinance"]),
        "googledoc": z.string(),
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

    export async function getChangers(
        law: CityLaw
    ) {
        return (await CityActs.getCityActs())
            .flatMap((act) => {
                const data = act.data as CityActs.CityAct;
                return data.changes.map((change) => ({
                    kind: change.kind,
                    target: change.target,
                    act
                }));
            })
            .filter((changer) => changer.target === law.slug);
    }
}

// ############################################################
// City Acts (Changes to City Law)
// ############################################################

export namespace CityActs {
    export const Schema = NewsItemSchema.extend({
        "layout": z.literal("@layouts/news/city-act.astro"),
        "changetocitylaw": z.literal(true),
        "institution": z.enum(["council", "mayor", "referendum"]),
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
}

// ############################################################
// Council Elections
// ############################################################

export namespace CouncilElections {
    export type CouncilElection = z.infer<typeof Schema>;
    export const Schema = NewsItemSchema.extend({
        "layout": z.literal("@layouts/news/council-election.astro"),
        "councilelection": z.literal(true),
        "term": z.coerce.number().int().positive(),
        "councillors": z.array(z.object({
            "name": z.string(),
            "role": z.string().optional(),
        })).optional().default([])
    });

    export function isCouncilElection(
        frontmatter: any
    ) {
        return frontmatter["councilelection"] === true;
    }

    export function ensureCouncilElection(
        frontmatter: MarkdownLayoutProps<CouncilElection>["frontmatter"]
    ): CouncilElection {
        frontmatter.councillors ??= [];
        return frontmatter;
    }

    /**
     * Retrieves all council elections sorted from newest to oldest.
     */
    export async function getCouncilElections() {
        return (await getCollection("city-news"))
            .filter((entry) => isCouncilElection(entry.data))
            .sort(Arrays.sortByDate((entry) => entry.data.date))
            .reverse();
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
        "secretary_of_state": RoleSlotSchema,
        "speaker": RoleSlotSchema,
        "senators": z.array(SenatorSeatSchema),
    });

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
            secretary_of_state: defaultSlot,
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
            { title: "Secretary of State", slot: data.secretary_of_state },
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
    });

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
        "officials": z.array(z.object({
            "name": z.string(),
            "role": z.string(),
            "action": z.enum(["elected", "reelected", "appointed", "resigned", "removed", "succeeded"])
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
            "mayor-vote"
        ]),
        "officials": z.array(z.object({
            "name": z.string(),
            "role": z.string(),
            "action": z.enum(["elected", "reelected", "appointed", "resigned", "removed", "succeeded"])
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
