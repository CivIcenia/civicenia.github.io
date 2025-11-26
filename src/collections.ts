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
