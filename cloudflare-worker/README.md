# Cloudflare Workers OAuth proxy + committer

This project provides a minimal Cloudflare Workers implementation of:
- GitHub OAuth proxy (code→token exchange, session cookie)
- Simple committer endpoint that uses the editor's GitHub token to create a branch and open a PR

It is designed to be cheap (Cloudflare Workers free tier), mobile-friendly, and minimal to get started.

Files included (to create from the examples below):
- worker.mjs — the Worker script
- wrangler.toml — Cloudflare Workers config

Quick decision note:
- This implementation uses editor GitHub tokens (from OAuth) to perform commits/PRs.
- For stronger security, swap to a GitHub App-based committer (server-side) — see "Upgrade to GitHub App" below.

Required secrets (set via wrangler secret):
- GITHUB_CLIENT_ID
- GITHUB_CLIENT_SECRET
- SESSION_SECRET (HMAC key for session JWT)

--- worker.mjs ---
The following is a complete Worker implementation. Create a file named [worker.mjs](cloudflare-worker/worker.mjs:1) with this content.

```javascript
// javascript
// Minimal Cloudflare Worker OAuth proxy + committer
const GITHUB_AUTHORIZE = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN = 'https://github.com/login/oauth/access_token';
const GITHUB_API = 'https://api.github.com';

function base64UrlEncode(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function signHmac(payload, key) {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(payload));
  return base64UrlEncode(sig);
}

async function makeJWT(obj, secret, expSeconds = 900) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = Object.assign({ iat: now, exp: now + expSeconds }, obj);
  const enc = s => base64UrlEncode(new TextEncoder().encode(s));
  const header64 = enc(JSON.stringify(header));
  const payload64 = enc(JSON.stringify(payload));
  const toSign = `${header64}.${payload64}`;
  const sig = await signHmac(toSign, secret);
  return `${toSign}.${sig}`;
}

async function verifyJWT(token, secret) {
  try {
    const [h, p, s] = token.split('.');
    if (!h || !p || !s) return null;
    const toSign = `${h}.${p}`;
    const expected = await signHmac(toSign, secret);
    if (expected !== s) return null;
    const payloadJson = atob(p.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson);
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

function redirect(url) {
  return new Response(null, { status: 302, headers: { Location: url } });
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (path === '/auth/login') {
      const state = crypto.getRandomValues(new Uint8Array(16)).join('');
      const params = new URLSearchParams({
        client_id: env.GITHUB_CLIENT_ID,
        scope: 'repo',
        state,
      });
      const dest = `${GITHUB_AUTHORIZE}?${params.toString()}`;
      return redirect(dest);
    }

    if (path === '/auth/callback') {
      const q = url.searchParams;
      const code = q.get('code');
      if (!code) return json({ error: 'missing_code' }, 400);
      const tokenRes = await fetch(GITHUB_TOKEN, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });
      const tokenJson = await tokenRes.json();
      if (tokenJson.error) return json({ error: 'token_exchange_failed', detail: tokenJson }, 400);
      const session = await makeJWT({ gh_token: tokenJson.access_token }, env.SESSION_SECRET, 60 * 60);
      const res = redirect('/admin/');
      const cookie = `session=${session}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${60 * 60}`;
      res.headers.set('Set-Cookie', cookie);
      return res;
    }

    if (path === '/api/whoami') {
      const cookie = request.headers.get('Cookie') || '';
      const match = cookie.match(/(?:^|; )session=([^;]+)/);
      if (!match) return json({ authenticated: false }, 200);
      const token = match[1];
      const payload = await verifyJWT(token, env.SESSION_SECRET);
      if (!payload) return json({ authenticated: false }, 200);
      return json({ authenticated: true });
    }

    if (path === '/api/create-pr' && request.method === 'POST') {
      const cookie = request.headers.get('Cookie') || '';
      const match = cookie.match(/(?:^|; )session=([^;]+)/);
      if (!match) return json({ error: 'not_authenticated' }, 401);
      const token = match[1];
      const payload = await verifyJWT(token, env.SESSION_SECRET);
      if (!payload) return json({ error: 'invalid_session' }, 401);
      const body = await request.json();
      const { repo, base, branch, files, title } = body;
      if (!repo || !base || !branch || !files || !title) return json({ error: 'missing_fields' }, 400);
      const ghToken = payload.gh_token;
      const octoHeaders = {
        Authorization: `token ${ghToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'cloudflare-worker-git-proxy',
      };
      // 1) Get base commit SHA
      const refRes = await fetch(`${GITHUB_API}/repos/${repo}/git/ref/heads/${base}`, { headers: octoHeaders });
      if (!refRes.ok) return json({ error: 'base_ref_not_found' }, 400);
      const refJson = await refRes.json();
      const baseSha = refJson.object.sha;
      // 2) Create branch
      const createRefRes = await fetch(`${GITHUB_API}/repos/${repo}/git/refs`, {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, octoHeaders),
        body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseSha }),
      });
      if (!createRefRes.ok) return json({ error: 'create_branch_failed', status: createRefRes.status }, 400);
      // 3) For each file, create blob and tree entries
      const blobs = [];
      for (const f of files) {
        const blobRes = await fetch(`${GITHUB_API}/repos/${repo}/git/blobs`, {
          method: 'POST',
          headers: Object.assign({ 'Content-Type': 'application/json' }, octoHeaders),
          body: JSON.stringify({ content: f.content, encoding: 'utf-8' }),
        });
        if (!blobRes.ok) return json({ error: 'blob_failed' }, 400);
        const blobJson = await blobRes.json();
        blobs.push({ path: f.path, sha: blobJson.sha });
      }
      // 4) Create tree
      const treeRes = await fetch(`${GITHUB_API}/repos/${repo}/git/trees`, {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, octoHeaders),
        body: JSON.stringify({ base_tree: baseSha, tree: blobs.map(b => ({ path: b.path, mode: '100644', type: 'blob', sha: b.sha })) }),
      });
      if (!treeRes.ok) return json({ error: 'tree_failed' }, 400);
      const treeJson = await treeRes.json();
      // 5) Create commit
      const commitRes = await fetch(`${GITHUB_API}/repos/${repo}/git/commits`, {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, octoHeaders),
        body: JSON.stringify({ message: title, tree: treeJson.sha, parents: [baseSha] }),
      });
      if (!commitRes.ok) return json({ error: 'commit_failed' }, 400);
      const commitJson = await commitRes.json();
      // 6) Update branch ref to point to commit
      const updateRefRes = await fetch(`${GITHUB_API}/repos/${repo}/git/refs/heads/${branch}`, {
        method: 'PATCH',
        headers: Object.assign({ 'Content-Type': 'application/json' }, octoHeaders),
        body: JSON.stringify({ sha: commitJson.sha }),
      });
      if (!updateRefRes.ok) return json({ error: 'update_ref_failed' }, 400);
      // 7) Create PR
      const prRes = await fetch(`${GITHUB_API}/repos/${repo}/pulls`, {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, octoHeaders),
        body: JSON.stringify({ title, head: branch, base }),
      });
      if (!prRes.ok) return json({ error: 'pr_failed', status: prRes.status }, 400);
      const prJson = await prRes.json();
      return json({ pr: prJson.html_url });
    }

    return new Response('Not Found', { status: 404 });
  }
};
```

--- wrangler.toml ---
Create [wrangler.toml](cloudflare-worker/wrangler.toml:1) with this content and set account_id via Cloudflare dashboard:

```toml
# toml
name = "civicenia-admin-oauth"
main = "worker.mjs"
compatibility_date = "2025-01-01"

[env.production]
```

Deployment steps
1. Install Wrangler (Cloudflare CLI) and login: `npm install -g wrangler` then `wrangler login`.
2. Create the files above in a new folder and run `wrangler publish --name civicenia-admin-oauth`.
3. Add secrets:
   - `wrangler secret put GITHUB_CLIENT_ID`
   - `wrangler secret put GITHUB_CLIENT_SECRET`
   - `wrangler secret put SESSION_SECRET`
4. Configure your GitHub OAuth App callback to `https://<your-worker-domain>/auth/callback`.
5. Point Decap/Netlify CMS admin backend config auth_endpoint to your worker root `https://<your-worker-domain>`.

Security notes and upgrades
- Current commit flow uses editor access tokens. This requires editors to have repo permission to create branches/PRs. To avoid exposing user tokens and improve auditability, upgrade to a GitHub App committer:
  - Use the GitHub App private key to mint a JWT server-side, then request an installation access token and perform commits/PRs from the app.
  - Cloudflare Workers can sign JWTs using Web Crypto — see GitHub App docs. You'll need to store the PEM private key as a secret (split if necessary).
- Enforce branch protection and use PR review before merging to main.
- Rate limit `/api/create-pr` to prevent abuse.
- Use short session lifetimes and rotate SESSION_SECRET regularly.

Example client payload for `/api/create-pr`
```json
{
  "repo": "your-org/your-repo",
  "base": "main",
  "branch": "cms-update-2025-11-17-01",
  "title": "CMS: Update laws.yml",
  "files": [
    { "path": "src/data/laws.yml", "content": "new file content here" }
  ]
}
```

Troubleshooting
- If creating branches fails, verify the editor token has repo:status and repo scope and that the base ref exists.
- For file encodings larger than small text blobs, consider uploading media to a storage provider and committing references.

License: MIT

End of README
## What to input for the secrets

- GitHub Client ID: the "Client ID" shown in your GitHub OAuth App (GitHub → Settings → Developer settings → OAuth Apps → *your app*).  
  - Set it with: `wrangler secret put GITHUB_CLIENT_ID` and paste the Client ID when prompted.

- GitHub Client Secret: the "Client Secret" from the same OAuth App.  
  - Set it with: `wrangler secret put GITHUB_CLIENT_SECRET` and paste the secret when prompted.

- SESSION_SECRET: a strong random secret used to sign session JWTs (keep private). Generate and push it from PowerShell:

```powershell
# powershell
# generate a 32-byte hex SESSION_SECRET, print it, and push to Wrangler
$bytes = New-Object 'System.Byte[]' 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$session = ([System.BitConverter]::ToString($bytes) -replace '-','').ToLower()
Write-Host "SESSION_SECRET: $session"
# push to Cloudflare (wrangler will prompt to confirm)
$session | wrangler secret put SESSION_SECRET
```

Notes:
- You can also run the helper script: [`cloudflare-worker/generate-secrets.ps1`](cloudflare-worker/generate-secrets.ps1:1).  
- Keep the Client Secret and SESSION_SECRET confidential; do not commit them into the repo.  
- After adding secrets, publish the worker with `wrangler publish` and verify the callback URL in your GitHub OAuth App is `https://<your-worker-domain>/auth/callback`.
Quick publish now (get workers.dev callback URL)

1) Confirm wrangler config
- Ensure your Cloudflare account ID is set in [`cloudflare-worker/wrangler.toml`](cloudflare-worker/wrangler.toml:1).
- Worker name is already set to `civicenia-admin-oauth` in [`cloudflare-worker/wrangler.toml`](cloudflare-worker/wrangler.toml:1).

2) Install & login (PowerShell)
```powershell
# powershell
npm install -g wrangler
wrangler login
wrangler whoami
```
Expected: your Cloudflare account info from `wrangler whoami`.

3) Publish the worker (no secrets required to publish)
```bash
# bash
cd cloudflare-worker
wrangler publish
```
Expected output (summary):
- Building project...
- Uploading script...
- Published worker to: https://civicenia-admin-oauth.<subdomain>.workers.dev

Notes:
- Publishing does not require `GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET` to be set. You will get the workers.dev domain immediately.
- Runtime requests to /auth/login will fail until you add the GitHub OAuth Client ID/Secret as secrets (next step).

4) Add secrets (after you create the OAuth App)
```bash
# bash
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
wrangler secret put SESSION_SECRET
```
On Windows PowerShell you can generate SESSION_SECRET:
```powershell
# powershell
$bytes = New-Object 'System.Byte[]' 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$session = ([System.BitConverter]::ToString($bytes) -replace '-','').ToLower()
Write-Host "SESSION_SECRET: $session"
$session | wrangler secret put SESSION_SECRET
```

5) Configure GitHub OAuth App callback
- In GitHub Developer settings, set Authorization callback URL to:
  https://<your-worker-domain>/auth/callback
  where `<your-worker-domain>` is the workers.dev domain returned after publish.

6) Update CMS backend
- Edit [`public/admin/config.yml`](public/admin/config.yml:1) and set:
```yaml
backend:
  name: github
  repo: your-org/your-repo
  branch: main
  auth_endpoint: "https://<your-worker-domain>"
  open_authoring: false
```

Troubleshooting
- If `wrangler publish` errors with account mismatch: run `wrangler whoami` and ensure `account_id` in [`cloudflare-worker/wrangler.toml`](cloudflare-worker/wrangler.toml:1) matches.
- If publish fails due to module/build: ensure `type = "javascript"` and `upload_format = "modules"` in [`cloudflare-worker/wrangler.toml`](cloudflare-worker/wrangler.toml:1) and use `wrangler publish --verbose` to inspect logs.
- After adding secrets, re-publish to ensure the runtime has access to them.

Once you have the workers.dev URL, tell me and I will walk you through creating the GitHub OAuth App and adding the secrets interactively.