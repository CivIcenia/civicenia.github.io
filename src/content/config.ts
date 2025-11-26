// https://docs.astro.build/en/guides/content-collections/#defining-collections
import { z, defineCollection } from "astro:content";
import { Acts, Elections, CityActs, CouncilElections, OfficialChanges, CityOfficialChanges } from "@collections";

export const collections = {
    "news": defineCollection({
        type: "content",
        schema: z.discriminatedUnion("layout", [
            Acts.Schema,
            Elections.Schema,
            OfficialChanges.Schema
        ])
    }),
    "city-news": defineCollection({
        type: "content",
        schema: z.discriminatedUnion("layout", [
            CityActs.Schema,
            CouncilElections.Schema,
            CityOfficialChanges.Schema
        ])
    })
};
