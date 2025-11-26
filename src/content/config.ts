// https://docs.astro.build/en/guides/content-collections/#defining-collections
import { z, defineCollection } from "astro:content";
import { Acts, CityActs, OfficialChanges, CityOfficialChanges } from "@collections";

export const collections = {
    "news": defineCollection({
        type: "content",
        schema: z.discriminatedUnion("layout", [
            Acts.Schema,
            OfficialChanges.Schema
        ])
    }),
    "city-news": defineCollection({
        type: "content",
        schema: z.discriminatedUnion("layout", [
            CityActs.Schema,
            CityOfficialChanges.Schema
        ])
    })
};
