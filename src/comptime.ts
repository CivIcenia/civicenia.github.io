import { type AstroGlobal } from "astro";
import { Astros } from "@helpers";

import { TITLE as _TITLE, DESCRIPTION as _DESCRIPTION } from "./constants";
export const TITLE = _TITLE;
export const DESCRIPTION = _DESCRIPTION;

export const PERMALINK_ROOTS = Object.freeze({
    // Use the build-time BASE so permalinks include the project base path
    news: (import.meta.env.BASE_URL ?? "/") + "news/",
    cityNews: (import.meta.env.BASE_URL ?? "/") + "icenia-city/news/",
});

export function getActChangeColours(
    type: "passage" | "amendment" | "repeal" | string
): { background: string, text: string } {
    switch (type) {
        case "passage":
            return { background: "3A8017", text: "F2F2F2" };
        case "amendment":
            return { background: "F1C000", text: "000000" };
        case "repeal":
            return { background: "BA1E0D", text: "F2F2F2" };
        default:
            return { background: "787878", text: "000000" };
    }
}

export function getBordersLink(
    astro: AstroGlobal
) {
    const BASE = (import.meta.env.BASE_URL ?? "/");
    return Astros.isDevMode() ? BASE + "government/map" : "https://map.civinfo.net/#url=" + astro.url.origin + BASE + "government/borders.json"
}
