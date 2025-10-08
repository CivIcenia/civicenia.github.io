import { type AstroGlobal } from "astro";

export const TITLE = "Government of Icenia";
export const DESCRIPTION = "They work for you.";

export const EXCERPT_SEPARATOR = "<!--more-->";

export const PERMALINK_ROOTS = Object.freeze({
    news: "/news/",
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
    return "https://map.civinfo.net/#url=" + astro.url.origin + "/government/borders.json"
}
