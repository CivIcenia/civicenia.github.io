import { z } from "astro:content";
import { 
    RoleSlotSchema, 
    SenatorSeatSchema, 
    GovOfficialsSchema,
    OfficialChangeSchema 
} from "@schemas";
import { Arrays } from "@helpers";
import { getCollection } from "astro:content";
import OfficialsData from "../data/officials.yml";

// ############################################################
// Official Changes (News) - Government
// ############################################################

export namespace OfficialChanges {
    export const Schema = OfficialChangeSchema;
    export type OfficialChange = z.infer<typeof OfficialChangeSchema>;

    export function isOfficialChange(
        frontmatter: any
    ): frontmatter is OfficialChange {
        return frontmatter["officialchange"] === true;
    }

    export function ensureOfficialChange(
        frontmatter: any
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
// Government Officials
// ############################################################

export namespace GovOfficials {
    export const RoleSlotSchema_ = RoleSlotSchema;
    export type RoleSlot = z.infer<typeof RoleSlotSchema>;

    export const SenatorSeatSchema_ = SenatorSeatSchema;
    export type SenatorSeat = z.infer<typeof SenatorSeatSchema>;

    export const Schema = GovOfficialsSchema;
    export type OfficialsData = z.infer<typeof GovOfficialsSchema>;

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
    
    /**
     * Get the latest Senate term number from official change posts
     */
    export async function getLatestSenateTermNumber(): Promise<number | null> {
        const changes = await OfficialChanges.getOfficialChanges();
        const elections = changes.filter((change) => {
            // Type assertion needed because getCollection returns union type
            const data = change.data as OfficialChanges.OfficialChange;
            return (data.changetype === "senate-election" || 
                    data.changetype === "senate-byelection") &&
                data.term;
        });
        if (elections.length > 0) {
            const data = elections[0].data as OfficialChanges.OfficialChange;
            return data.term!;
        }
        return null;
    }
}
