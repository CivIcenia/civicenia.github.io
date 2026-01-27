import { type MarkdownLayoutProps } from "astro";
import { z, getCollection } from "astro:content";
import { Arrays } from "@helpers";
import { ActSchema } from "@schemas";

// ############################################################
// Acts (Federal - Changes to Federal Law)
// ############################################################

export namespace Acts {
    export const Schema = ActSchema;
    export type Act = z.infer<typeof ActSchema>;

    export function isAct(
        frontmatter: any
    ): frontmatter is Act {
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
