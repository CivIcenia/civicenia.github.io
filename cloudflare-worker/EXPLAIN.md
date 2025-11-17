# Cloudflare Worker — Logic Flow

Overview:
- The worker acts as an OAuth proxy and committer for Decap/Netlify CMS.

Auth flow (browser)
1. Client requests /auth/login
   - Worker generates state and redirects to GitHub authorize with client_id, scope=repo, state.
2. User approves and GitHub redirects to /auth/callback?code=...
   - Worker exchanges code for access_token at https://github.com/login/oauth/access_token using GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.
   - On success, worker creates a session JWT containing gh_token and sets it as HttpOnly Secure SameSite=Strict cookie.
   - Worker redirects user to ADMIN_URL (env) or /admin/.

Session JWT details
- Signed with HMAC-SHA256 using SESSION_SECRET.
- Payload includes iat, exp (default 1h) and gh_token.
- Cookie attributes: Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=3600.
- Verification: verify signature, parse payload, check exp.

whoami endpoint (/api/whoami)
- Reads session cookie, verifies JWT, returns {authenticated:true,user:payload} or {authenticated:false}.

create-pr endpoint (/api/create-pr) — preconditions
- POST only. Requires valid session cookie (JWT) and payload: {repo, base, branch, files, title}.
- files: array of {path, content} (content is the file body, utf-8).

create-pr main steps
1) Verify session and extract gh_token.
2) Build Authorization headers: Authorization: token <gh_token>, Accept: application/vnd.github.v3+json.
3) Get base ref SHA: GET /repos/:repo/git/ref/heads/:base
   - If not ok → base_ref_not_found.
4) Create branch ref: POST /repos/:repo/git/refs with ref: refs/heads/:branch and sha: baseSha.
   - If exists or fails → create_branch_failed.
5) For each file:
   - POST /repos/:repo/git/blobs with {content, encoding:'utf-8'} → returns blob sha.
   - Collect blob entries {path, mode:'100644', type:'blob', sha}.
6) Create tree: POST /repos/:repo/git/trees with base_tree: baseSha and tree: blobEntries.
   - If fails → tree_failed.
7) Create commit: POST /repos/:repo/git/commits {message:title, tree:treeSha, parents:[baseSha]}.
   - If fails → commit_failed.
8) Update branch ref: PATCH /repos/:repo/git/refs/heads/:branch with sha: commitSha.
   - If fails → update_ref_failed.
9) Create PR: POST /repos/:repo/pulls {title, head:branch, base}.
   - If fails → pr_failed.
10) Return {pr: pr_html_url}.

Error handling & idempotency
- The worker returns structured JSON errors with short codes for each failure stage.
- Branch creation may fail if branch already exists; upstream clients should use unique branch names.
- Commits are atomic once created; if any step fails, subsequent cleanup is not automatic.

Security considerations
- Current flow uses editor's OAuth token: actions run with editor's repo scopes.
- Prefer GitHub App: worker signs JWT with private key → request installation token → perform commits as app (no user token exposure).
- Use short session TTL, HttpOnly cookies, SameSite Strict.
- Rate limit /api/create-pr and validate payload size to prevent abuse.
- Enforce branch protection and require PR reviews before merge.

Performance and costs
- Worker is lightweight; GitHub API calls are the main latency.
- Large files: use object storage and commit references instead of blobs.

Testing and debugging tips
- Use the make_session helper to craft a session cookie for testing without doing OAuth.
- Use run_e2e.js to automate whoami + create-pr.
- Inspect responses and status codes from GitHub API to see which step failed.
- Enable logging in worker (console.*) during dev or use Miniflare for local runs.

Upgrade path to GitHub App (summary)
1) Create GitHub App and obtain private key and app id.
2) In worker, sign a JWT (RS256) with private key and request installation token: POST /app/installations/:id/access_tokens.
3) Use installation token in Authorization: token <installation_token> for commit flow.
4) Optionally keep per-user attribution by creating commit message footers with user login.

Conclusion
- The worker handles OAuth and PR workflow by sequencing GitHub REST calls; testing and securing tokens are the main operational concerns.