# Domain switch guide

This document lists places to change when moving the repo or hosting under a different GitHub Pages username/repo.

Files you should check and update:

1. astro.config.ts
- Update `site` and `base` to match your Pages site:
  site: "https://<username>.github.io/<repo>"
  base: "/<repo>/"
  For user/organization sites (username.github.io) set base: "/"

2. src/layouts/default.astro
- Ensure static asset links and internal hrefs use the build base.
- This repo uses `import.meta.env.BASE_URL` (variable `BASE`) to build asset paths; confirm any remaining hardcoded "/" paths are intentional.
- If your live site is requesting assets from `https://<username>.github.io/assets/...` (root) instead of `https://<username>.github.io/<repo>/assets/...` (project-site), the generated HTML contains root‑absolute paths ("/assets/...") because the site was built or deployed without the correct base.

3. public/admin/config.yml
- `backend.repo`: set to "username/repo"
- `auth_endpoint` and `media_folder` should be checked if you host admin or the proxy elsewhere.

4. cloudflare-worker/wrangler.toml and tests
- `[vars]` `ADMIN_URL` should point to the admin URL on your Pages site:
  ADMIN_URL = "https://<username>.github.io/<repo>/admin/"
- Update tests and helpers that assume the repo, e.g. `cloudflare-worker/test/run_e2e.js` (REPO env var).

5. Content files with absolute domain references
- Some markdown files reference `https://civicenia.github.io/...` (eg: borders.json).
- Decide:
  A) Convert to relative URLs (recommended): `/government/borders.json`
  B) Update to your site domain: `https://<username>.github.io/<repo>/...`
- To find them: run: `git grep "civicenia.github.io"` or search for `github.io` in the repo.

6. README.md and docs
- Update clone URL examples and any documentation pointing to the original organisation.

7. Git configuration
- Update git remote to your fork:
  `git remote set-url origin https://github.com/<username>/<repo>.git`

Why deployed site requested wrong asset URLs
- Symptom: Browser requested
  https://creepilycreeper.github.io/assets/... (root) but assets live at
  https://creepilycreeper.github.io/civicenia.github.io/assets/ (project-site path).
- Cause: Generated HTML used root-absolute hrefs ("/assets/..."). Astro resolves the site base at build time (astro.config.ts). If the site was built without base="/civicenia.github.io/" or the built output wasn't deployed, browsers will request the wrong root paths.

Recommended fix (build + deploy the built output to gh-pages)
1) Verify astro.config.ts contains:
   site: "https://creepilycreeper.github.io/civicenia.github.io"
   base: "/civicenia.github.io/"

2) Build locally and inspect generated HTML:
   - bun install
   - bun run build
   - Inspect ./dist/index.html (or any page). Asset hrefs should be either:
     "/civicenia.github.io/assets/..." OR
     "https://creepilycreeper.github.io/civicenia.github.io/assets/..."
   - If hrefs are still "/assets/..." the build didn't pick up the base.

3) Deploy the built output to gh-pages (recommended)
   - Use a GitHub Action that builds and pushes `dist/` to the `gh-pages` branch.
   - Configure GitHub Pages to serve from branch: `gh-pages`, folder: `/`.
   - After publishing, the live site will serve the built files and asset URLs will resolve under `/civicenia.github.io/`.

Example GitHub Action (add `.github/workflows/gh-pages.yml`)
```yaml
name: Build and deploy to gh-pages

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install bun
        run: curl -fsSL https://bun.sh/install | bash
      - name: Add bun to PATH
        run: echo "$HOME/.bun/bin" >> $GITHUB_PATH
      - name: Install dependencies
        run: bun install
      - name: Build
        run: bun run build
      - name: Deploy to gh-pages
        uses: JamesIves/github-pages-deploy-action@v4
        with:
          branch: gh-pages
          folder: dist
```

4) Configure GitHub Pages
- Repo → Settings → Pages
- Source: Branch → gh-pages, Folder → /
- Save and wait for the site to publish.

Temporary workaround (quick live fix)
- Add a <base> tag in the `<head>` so the browser resolves "/" relative to the repo path:
  `<base href="/civicenia.github.io/">`
- Add this to `src/layouts/default.astro` and rebuild/deploy. This is a stopgap; prefer the proper build+deploy flow.

Validation & checklist (updated)
- [ ] astro.config.ts contains correct site & base
- [ ] Build output (dist) has asset hrefs under `/civicenia.github.io/`
- [ ] GitHub Action publishes `dist/` to `gh-pages`
- [ ] Pages configured to serve `gh-pages` branch (root)
- [ ] Live site now fetches assets from https://creepilycreeper.github.io/civicenia.github.io/assets/...

If you want I can:
- Add the GitHub Action file (`.github/workflows/gh-pages.yml`) to this repo, or
- Add the temporary `<base>` tag to `src/layouts/default.astro` and commit it for an immediate live fix.
