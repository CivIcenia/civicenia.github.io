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
- This repo now uses `import.meta.env.BASE_URL` (variable `BASE`) to build asset paths; confirm any remaining hardcoded "/" paths are intentional.

3. public/admin/config.yml
- `backend.repo`: set to "username/repo"
- `auth_endpoint` and `media_folder` should be checked if you host admin or the proxy elsewhere.

4. cloudflare-worker/wrangler.toml and tests
- `[vars]` `ADMIN_URL` should point to the admin URL on your Pages site:
  ADMIN_URL = "https://<username>.github.io/<repo>/admin/"
- Update tests and helpers that assume the repo, e.g. `cloudflare-worker/test/run_e2e.js` (REPO env var).

5. Content files with absolute domain references
- Some markdown files reference `https://civicenia.github.io/...` (e.g. borders.json links).
- Decide:
  A) Convert to relative URLs (recommended): `/government/borders.json`
  B) Update to your site domain: `https://<username>.github.io/<repo>/...`
- To find them: run: `git grep "civicenia.github.io"` or search for `github.io` in the repo.

6. README.md and docs
- Update clone URL examples and any documentation pointing to the original organisation.

7. Git configuration
- Update git remote to your fork:
  `git remote set-url origin https://github.com/<username>/<repo>.git`

Build & test
- Run the usual steps:
  - `bun install`
  - `bun run build`
  - Serve or open the built site and verify assets are loading from `https://<username>.github.io/<repo>/assets/...` (or root if it's a user site).

Quick checklist
- [ ] `astro.config.ts` updated (site & base)
- [ ] `src/layouts/default.astro` uses BASE and no remaining bad absolute asset paths
- [ ] `public/admin/config.yml` updated
- [ ] `cloudflare-worker/wrangler.toml` ADMIN_URL updated
- [ ] Content absolute links updated or intentionally left
- [ ] `README.md` updated
- [ ] Git remote updated
