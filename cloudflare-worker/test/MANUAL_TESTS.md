# Manual test steps

Prerequisites:
- Worker published at https://cf-github-proxy.icenia-auth.workers.dev
- Secrets set: GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, SESSION_SECRET
- ADMIN_URL points to GitHub Pages admin: https://creepilycreeper.github.io/civicenia.github.io/admin/
- Decap config updated: [`public/admin/config.yml`](public/admin/config.yml:1)
- Worker implementation: [`cloudflare-worker/worker.mjs`](cloudflare-worker/worker.mjs:1)

Browser OAuth flow
1. Open: https://cf-github-proxy.icenia-auth.workers.dev/auth/login
2. Approve GitHub OAuth when prompted.
3. After consent you should be redirected to the admin UI:
   https://creepilycreeper.github.io/civicenia.github.io/admin/
4. In browser DevTools → Application → Cookies check for a cookie named `session`
   (HttpOnly is set — cookie is visible in DevTools but not accessible to JS).
5. Open the admin UI and create or edit content; saving/publishing should trigger network
   calls to the worker (auth endpoint) and then the worker's `/api/create-pr`.

Manual curl tests (use the local helper)
1. Generate a session token locally:
   SESSION_SECRET=... GH_TOKEN=... node cloudflare-worker/test/make_session.js
   Copy the printed token value.
2. whoami:
   curl -s -H "Cookie: session=<TOKEN>" https://cf-github-proxy.icenia-auth.workers.dev/api/whoami
   Expected: JSON indicating authenticated true.
3. create-pr (example):
   curl -s -X POST https://cf-github-proxy.icenia-auth.workers.dev/api/create-pr \
     -H "Content-Type: application/json" \
     -H "Cookie: session=<TOKEN>" \
     -d '{
       "repo":"creepilycreeper/civicenia.github.io",
       "base":"main",
       "branch":"cms-test-<timestamp>",
       "title":"test: add tmp file",
       "files":[{"path":"tmp/test.txt","content":"hello from test"}]
     }'
   Expected: {"pr":"https://github.com/..."} or an error JSON explaining the failure.

Quick automated run (optional)
- SESSION_SECRET=... GH_TOKEN=... node cloudflare-worker/test/run_e2e.js

Common failures & fixes
- base_ref_not_found: verify the `base` branch exists (e.g. main) and repo name is correct.
- create_branch_failed: branch already exists or the token lacks repo scopes (need repo permission).
- blob/tree/commit/pr_failed: check GH API status code and body; ensure token has repo scope and repo is writable.
- OAuth errors: confirm GitHub OAuth App Authorization callback URL is:
  https://cf-github-proxy.icenia-auth.workers.dev/auth/callback
- Session problems: re-generate SESSION_SECRET, update wrangler secret, and re-publish the worker.

Debugging tips
- Use `wrangler tail` to stream worker logs while running requests.
- Inspect Network tab in DevTools to see requests from the admin UI to the worker endpoints.
- If you prefer CI tests, scaffold Miniflare + vitest to mock GitHub API responses.

End.