// https://docs.astro.build/en/guides/content-collections/#defining-collections
import { z, defineCollection } from "astro:content";
import {
    ActSchema,
    OfficialChangeSchema,
    CityActSchema,
    CityOfficialChangeSchema
} from "../schemas";

export const collections = {
    "news": defineCollection({
        type: "content",
        schema: z.discriminatedUnion("layout", [
            ActSchema,
            OfficialChangeSchema
        ])
    }),
    "city-news": defineCollection({
        type: "content",
        schema: z.discriminatedUnion("layout", [
            CityActSchema,
            CityOfficialChangeSchema
        ])
    })
};
