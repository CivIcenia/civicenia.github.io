import { type MarkdownLayoutProps } from "astro";
import { z, getCollection } from "astro:content";
import { Arrays } from "@helpers";
import { CityActSchema } from "@schemas";

// ############################################################
// City Acts (Changes to City Law)
// ############################################################

export namespace CityActs {
    export const Schema = CityActSchema;
    export type CityAct = z.infer<typeof CityActSchema>;

    export function isCityAct(
        frontmatter: any
    ): frontmatter is CityAct {
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
