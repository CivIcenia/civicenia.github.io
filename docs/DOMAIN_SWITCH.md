# Domain switch guide

This document lists places to change/be aware of when moving the repo or hosting under a different GitHub Pages username/repo.

Files you should check and update:

1. [`astro.config.ts`](astro.config.ts:1)
- Update `site` and `base` to match your Pages site.
- Recommended approach: set `base` to the path prefix used by your project site, and use `${BASE}` at build time in templates.
- Example in code:
```ts
site: "https://<username>.github.io${BASE}"
base: "/<repo>/"
```
- For user/organization sites (username.github.io) set `base: "/"`.

2. [`src/layouts/default.astro`](src/layouts/default.astro:1)
- Ensure static asset links and internal hrefs use the build base.
- This repo uses `import.meta.env.BASE_URL` (variable `BASE`) to build asset paths; confirm any remaining hardcoded "/" paths are intentional.
- Example usage inside an Astro layout:
```ts
const BASE = import.meta.env.BASE_URL ?? "/";
<link rel="stylesheet" href={BASE + "assets/css/sanitize-13.0.0.css"} />
<img src={BASE + "assets/images/icenia_logo.png"} />
```

3. [`public/admin/config.yml`](public/admin/config.yml:1)
- `backend.repo`: set to "username/repo".
- `auth_endpoint` and `media_folder` should be checked if you host admin or the proxy elsewhere.


4. Content files with absolute domain references
- Some markdown files reference the old org domain (for example `https://civicenia.github.io/...`). Prefer using the build base (`${BASE}`) or relative URLs.
- Decide:
  A) Convert to relative URLs (recommended): `${BASE}government/borders.json` or `/government/borders.json`
  B) Update to your site domain using `${BASE}`: `https://<username>.github.io${BASE}...`
- To find them: run: `git grep "civicenia.github.io"` or search for `github.io` in the repo.

5. README.md and docs
- Update clone URL examples and any documentation pointing to the original organisation.
