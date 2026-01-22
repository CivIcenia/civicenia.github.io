import { z } from "astro:content";
import ScrapedItemsData from "../data/scraped-items.yml";
import CityScrapedItemsData from "../data/city-scraped-items.yml";

export namespace ScrapedItems {
    export const ItemSchema = z.object({
        id: z.string(),
        title: z.string(),
        date: z.coerce.date(),
        checked: z.boolean(),
        url: z.string().optional(),
    });

    export type Item = z.infer<typeof ItemSchema>;

    function parseItems(data: any): Item[] {
        const items = data?.items || data;
        if (!items || !Array.isArray(items)) {
            return [];
        }
        data = items;
        return data
            .map((item: unknown) => ItemSchema.safeParse(item))
            .filter((parsed): parsed is { success: true; data: Item } => parsed.success)
            .map((parsed) => parsed.data);
    }

    export function getRepublicItems(): Item[] {
        return parseItems(ScrapedItemsData);
    }

    export function getCityItems(): Item[] {
        return parseItems(CityScrapedItemsData);
    }

    export function getPendingRepublicCount(): number {
        return getRepublicItems().filter(item => !item.checked).length;
    }

    export function getPendingCityCount(): number {
        return getCityItems().filter(item => !item.checked).length;
    }
}
