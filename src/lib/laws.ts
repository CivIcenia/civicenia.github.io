import { z } from "astro:content";
import { LawSchema } from "@schemas";
import { Acts } from "./acts";
import LawsData from "../data/laws.yml";
import LawIncorporationsData from "../data/law-incorporations.yml";

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

// ############################################################
// Laws (Federal)
// ############################################################

export namespace Laws {
    export const Schema = LawSchema;
    export type Law = z.infer<typeof LawSchema>;

    export async function getLaws(): Promise<Law[]> {
        return ((LawsData as any)["entries"] || [])
            .map((law: unknown) => Schema.safeParse(law))
            .filter((parsed): parsed is { success: true; data: Law } => parsed.success)
            .map((parsed) => parsed.data);
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
