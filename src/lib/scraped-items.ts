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

    export function isUnchecked(headline: string, date: Date | string, isCity: boolean): boolean {
        const items = isCity ? getCityItems() : getRepublicItems();
        
        // Ensure we have a valid Date object
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
            return false;
        }

        const cleanHeadline = headline.trim().toLowerCase();

        return items.some(item => {
            if (item.checked) return false;
            
            const scrapedHeadline = item.title.replace(/^[^\d]*\d{2}-\d{2}[:\s—-]*\s*/i, '').trim().toLowerCase();
            
            // Headlines must match
            if (scrapedHeadline !== cleanHeadline) return false;

            // Dates can be slightly off (e.g. due to timezones or scraper delay)
            // We allow up to 2 days difference
            const itemDate = item.date instanceof Date ? item.date : new Date(item.date);
            const diffTime = Math.abs(dateObj.getTime() - itemDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            return diffDays <= 2;
        });
    }
}
