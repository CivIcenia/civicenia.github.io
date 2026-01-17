import { z } from "astro:content";
import { CityLawSchema } from "@schemas";
import { CityActs } from "./city-acts";
import CityLawsData from "../data/city-laws.yml";
import CityLawIncorporationsData from "../data/city-law-incorporations.yml";

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

// ############################################################
// City Laws
// ############################################################

export namespace CityLaws {
    export const Schema = CityLawSchema;
    export type CityLaw = z.infer<typeof CityLawSchema>;

    export async function getCityLaws(): Promise<CityLaw[]> {
        return ((CityLawsData as any)["entries"] || [])
            .map((law: unknown) => Schema.safeParse(law))
            .filter((parsed): parsed is { success: true; data: CityLaw } => parsed.success)
            .map((parsed) => parsed.data);
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
