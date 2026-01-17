import { z } from "astro:content";
import { 
    RoleSlotSchema, 
    CouncillorSeatSchema, 
    CouncillorsDataSchema,
    CityOfficialChangeSchema 
} from "@schemas";
import { Arrays } from "@helpers";
import { getCollection } from "astro:content";
import CouncillorsData from "../data/councillors.yml";

// ############################################################
// City Official Changes (News)
// ############################################################

export namespace CityOfficialChanges {
    export const Schema = CityOfficialChangeSchema;
    export type CityOfficialChange = z.infer<typeof CityOfficialChangeSchema>;

    export function isCityOfficialChange(
        frontmatter: any
    ): frontmatter is CityOfficialChange {
        return frontmatter["cityofficialchange"] === true;
    }

    export function ensureCityOfficialChange(
        frontmatter: any
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
// City Councillors
// ############################################################

export namespace Councillors {
    export const RoleSlotSchema_ = RoleSlotSchema;
    export type RoleSlot = z.infer<typeof RoleSlotSchema>;

    export const CouncillorSeatSchema_ = CouncillorSeatSchema;
    export type CouncillorSeat = z.infer<typeof CouncillorSeatSchema>;

    export const Schema = CouncillorsDataSchema;
    export type CouncillorsData = z.infer<typeof CouncillorsDataSchema>;

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
    
    /**
     * Get the latest Council term number from city official change posts
     */
    export async function getLatestCouncilTermNumber(): Promise<number | null> {
        const changes = await CityOfficialChanges.getCityOfficialChanges();
        const elections = changes.filter((change) => {
            // Type assertion needed because getCollection returns union type
            const data = change.data as CityOfficialChanges.CityOfficialChange;
            return (data.changetype === "council-election" || 
                    data.changetype === "council-byelection") &&
                data.term;
        });
        if (elections.length > 0) {
            const data = elections[0].data as CityOfficialChanges.CityOfficialChange;
            return data.term!;
        }
        return null;
    }
}
