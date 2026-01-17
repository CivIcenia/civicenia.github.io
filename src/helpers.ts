import { type Page } from "astro";

import { stripHtml as INTERNAL_stripHtml } from "string-strip-html";
import { parse as INTERNAL_parseMarkdown } from "marked";
import INTERNAL_formatDate from "dateformat";
import { generateFromObj as INTERNAL_paginate } from "@bramus/pagination-sequence";

import { EXCERPT_SEPARATOR } from "./constants";

export namespace Astros {
    export function isDevMode(): boolean {
        return import.meta.env.MODE === "development";
    }

    export function return404() {
        return new Response(null, {
            status: 404
        });
    }

    export function redirect(
        to: string
    ) {
        return new Response(`
            <!DOCTYPE html>
            <html lang="en">
                <meta charset="utf-8">
                <title>Redirecting...</title>
                <meta name="robots" content="noindex">
                <meta http-equiv="refresh" content="0;url=${to}">
                <h1>Redirecting...</h1>
                <a href="${to}">Click here if you are not redirected.</a>
            </html>
        `, {
            status: 200, // it's only 200 for the rendering engine
            headers: {
                "Content-Type": "text/html; charset=utf-8"
            }
        });
    }

    /**
     * @example
     * import { type APIContext } from "astro";
     * export async function GET(context: APIContext) {
     *     return renderJson({ "Hello": "World!" });
     * }
     */
    export function renderJson(
        json: Json.JSONValue
    ) {
        return new Response(JSON.stringify(json), {
            headers: {
                "Content-Type": "application/json; charset=utf-8"
            }
        });
    }

    export function getOrGenerateExcerpt(
        entry: {
            body: string,
            data: unknown
        }
    ): string {
        const excerpt = (entry.data as any).excerpt || null;
        if (excerpt !== null) {
            return excerpt;
        }
        const separatorIndex = entry.body.indexOf(EXCERPT_SEPARATOR);
        if (separatorIndex === -1) {
            return entry.body;
        }
        return entry.body.substring(0, separatorIndex);
    }

    export function paginate(
        page: Page
    ): [number | "..."] {
        return INTERNAL_paginate({
            curPage: page.currentPage,
            numPages: page.lastPage,
            numPagesAtEdges: 1,
            numPagesAroundCurrent: 1,
            glue: "..."
        }) as [number | "..."];
    }
}

export namespace Structs {
    export function createLink(
        label: string,
        href: string,
        target: "_self" | "_blank" | "_parent" | "_top" = "_self"
    ) {
        return { label, href, target };
    }

    export function official(
        titles: string[],
        name: string,
        pfp: string
    ) {
        return { titles, name, pfp };
    }
}

export namespace Nullish {
    export function exists(
        thing: unknown
    ): boolean {
        return (thing ?? null) !== null;
    }

    /**
     * Requires that a given thing has a value, or throws an error.
     */
    export function mustExist<T>(
        thing: T,
        message?: string
    ): NonNullable<T> {
        if (exists(thing)) {
            return thing!;
        }
        throw new Error(message ?? "Given thing must exist!");
    }
}

export namespace Json {
    export type JSONObject = { [key: string]: JSONValue | undefined };
    export type JSONArray = JSONValue[];
    export type JSONValue = JSONObject | JSONArray | string | number | boolean | null;

    /** Wrapper function for JSON.parse() that provides a proper return type. */
    export function parseJson(raw: string): JSONValue {
        return JSON.parse(raw)
    }
}

export namespace Arrays {
    export type ElementType<ArrayType> = ArrayType extends readonly (infer ElementType)[] ? ElementType : never;

    export function hasElements<T>(
        array?: T[]
    ): boolean {
        return (array?.length ?? 0) > 0;
    }

    /**
     * Somewhat equivalent to [].join(), but instead of joining into a string, it's
     * combining into another array.
     */
    export function insertBetween<T>(
        array: readonly T[],
        between: () => T
    ): T[] {
        return array.flatMap((ele) => [ele, between()]).slice(0, -1);
    }

    /**
     * @example
     * const test = [{ time: new Date() }, { time: new Date(12345) }];
     * test.sort(sortByDate((entry) => entry.time));
     */
    export function sortByDate<T>(
        getter: (entry: T) => Date
    ): (lhs: T, rhs: T) => number {
        return (lhs, rhs) => getter(lhs).getTime() - getter(rhs).getTime();
    }

    export function toMap<T, K>(
        array: T[],
        keyer: (ele: T) => K
    ): Map<K, T> {
        return new Map(
            array.map((entry) => [keyer(entry), entry])
        );
    }
}

export namespace Strings {
    export function normaliseWhitespace(
        text: string
    ): string {
        return text.replaceAll(/\s+/gm, " ");
    }

    export function stripNewLines(
        text: string
    ): string {
        return text.replace("\n", "").replace("\r", "");
    }

    export function stripHtml(
        html: string
    ): string {
        return INTERNAL_stripHtml(html).result;
    }

    export async function parseMarkdown(md: string): Promise<string> {
        const rendered = await INTERNAL_parseMarkdown(md);
        const BASE = (import.meta.env.BASE_URL ?? "/");
        // Rewrite absolute paths like src="/archive/..." or href='/assets/...' to include BASE.
        // We capture src|href, the quote char, then the path without the leading slash.
        return rendered.replace(/(src|href)=("|')\/([^"']+)/g, (_m, attr, q, rest) => {
            return `${attr}=${q}${BASE}${rest}${q}`;
        });
    }
    export const formatDate = INTERNAL_formatDate;
}

export namespace News {
    export function ensureAct<T extends { changes?: any }>(frontmatter: T): T {
        frontmatter.changes ??= [];
        return frontmatter;
    }

        export function formatActNumber(act: { term_number?: number, act_number?: number }): string {
        if (act.term_number && act.act_number) {
            const term = act.term_number.toString().padStart(2, '0');
            const num = act.act_number.toString().padStart(2, '0');
            return `${term}-${num}`;
        }
        return '';
    }

    export function ensureOfficialChange<T extends { officials?: any }>(frontmatter: T): T {
        frontmatter.officials ??= [];
        return frontmatter;
    }
}

export namespace Dates {
    export function parseDate(
        value: any
    ): Date | null {
        if (value instanceof Date) {
            if (!isNaN(value.getTime())) {
                return value;
            }
        }
        else if (typeof value === "string" || typeof value === "number") {
            return parseDate(new Date(value));
        }
        return null;
    }
}
