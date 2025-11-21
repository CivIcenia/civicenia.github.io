// Cloudflare Worker OAuth proxy + committer
const GITHUB_AUTHORIZE = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN = 'https://github.com/login/oauth/access_token';
const GITHUB_API = 'https://api.github.com';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function base64UrlEncode(bytes) {
  let str = '';
  const view = new Uint8Array(bytes);
  for (let i = 0; i < view.length; i++) str += String.fromCharCode(view[i]);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmacSha256(data, key) {
  const k = await crypto.subtle.importKey('raw', encoder.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, encoder.encode(data));
  return sig;
}

async function makeJWT(payloadObj, secret, expSeconds = 900) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = Object.assign({ iat: now, exp: now + expSeconds }, payloadObj);
  const header64 = base64UrlEncode(encoder.encode(JSON.stringify(header)));
  const payload64 = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const toSign = `${header64}.${payload64}`;
  const sig = await hmacSha256(toSign, secret);
  const sig64 = base64UrlEncode(sig);
  return `${toSign}.${sig64}`;
}

async function verifyJWT(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [h, p, s] = parts;
    const toSign = `${h}.${p}`;
    const expectedSig = await hmacSha256(toSign, secret);
    const expected = base64UrlEncode(expectedSig);
    if (expected !== s) return null;
    const payloadJson = atob(p.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson);
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;
    return payload;
  } catch (e) { return null; }
}

// Helper to compute allowed CORS origin based on configured ADMIN_URL and actual request origin.
function getAllowedOrigin(request, env) {
  const reqOrigin = request.headers.get('Origin') || '';
  try {
    if (env.ADMIN_URL) {
      // ADMIN_URL may include path; use only origin (scheme + host + port)
      const adminOrigin = new URL(env.ADMIN_URL).origin;
      // If the request originates from the admin origin, echo it; otherwise default to adminOrigin.
      if (reqOrigin === adminOrigin) return adminOrigin;
      // Fallback: if there's no Origin header, return adminOrigin so we can support direct browser redirects.
      return adminOrigin;
    }
  } catch (e) {
    // ignore parse errors
  }
  return reqOrigin || '*';
}

function makeCorsHeaders(origin) {
  const h = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
  return h;
}

function redirect(url, corsHeaders = {}) {
  const res = new Response(null, { status: 302, headers: Object.assign({ Location: url }, corsHeaders) });
  return res;
}

function json(body, status = 200, corsHeaders = {}) {
  const headers = Object.assign({ 'Content-Type': 'application/json' }, corsHeaders);
  return new Response(JSON.stringify(body), { status, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const origin = request.headers.get('Origin') || '';
    const allowedOrigin = getAllowedOrigin(request, env);
    const cors = makeCorsHeaders(allowedOrigin);

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (path === '/auth/login') {
      const state = crypto.getRandomValues(new Uint8Array(16)).join('');
      const redirectUri = `${url.origin}/auth/callback`;
      const params = new URLSearchParams({
        client_id: env.GITHUB_CLIENT_ID,
        redirect_uri: redirectUri,
        scope: 'repo',
        state
      });
      // Redirect directly to GitHub authorization endpoint
      return redirect(`${GITHUB_AUTHORIZE}?${params.toString()}`, cors);
    }

    if (path === '/auth/callback') {
      const code = url.searchParams.get('code');
      if (!code) return json({ error: 'missing_code' }, 400, cors);
      const redirectUri = `${url.origin}/auth/callback`;
      const tokenRes = await fetch(GITHUB_TOKEN, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: redirectUri
        })
      });
      const tokenJson = await tokenRes.json();
      if (tokenJson.error) return json({ error: 'token_exchange_failed', detail: tokenJson }, 400, cors);
      const session = await makeJWT({ gh_token: tokenJson.access_token }, env.SESSION_SECRET, 60 * 60);
      // Set cookie so subsequent proxied API calls from the admin can use the session.
      // Use SameSite=None because GitHub Pages (admin) is cross-site to the worker domain.
      const cookie = `session=${session}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=${60 * 60}`;
      // Determine admin origin for postMessage target. Prefer configured ADMIN_URL, fall back to '*'.
      let adminOrigin = '*';
      try {
        if (env.ADMIN_URL) adminOrigin = new URL(env.ADMIN_URL).origin;
      } catch (e) { /* ignore */ }
      // Return a small HTML page for the OAuth popup flow:
      // - Posts the GitHub access token and session back to window.opener via postMessage
      // - Closes the popup
      const html = `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>Decap OAuth</title></head>
  <body>
    <script>
      (function() {
        try {
          const payload = {
            provider: 'github',
            token: ${JSON.stringify(tokenJson.access_token)},
            session: ${JSON.stringify(session)}
          };
          // Post message to the opener (admin UI). Use the configured admin origin when possible.
          const target = ${JSON.stringify(adminOrigin)};
          if (window.opener) {
            try { window.opener.postMessage(payload, target); } catch (e) { window.opener.postMessage(payload, '*'); }
          }
        } catch (e) {
          // silently ignore
        } finally {
          window.close();
        }
      })();
    </script>
    <p>Authentication complete. You can close this window.</p>
  </body>
</html>`;
      const headers = Object.assign({ 'Content-Type': 'text/html; charset=utf-8', 'Set-Cookie': cookie }, cors);
      return new Response(html, { status: 200, headers });
    }

    if (path === '/api/whoami') {
      const cookie = request.headers.get('Cookie') || '';
      const m = cookie.match(/(?:^|; )session=([^;]+)/);
      if (!m) return json({ authenticated: false }, 200, cors);
      const payload = await verifyJWT(m[1], env.SESSION_SECRET);
      if (!payload) return json({ authenticated: false }, 200, cors);
      return json({ authenticated: true, user: payload }, 200, cors);
    }

    if (path === '/api/create-pr' && request.method === 'POST') {
      const cookie = request.headers.get('Cookie') || '';
      const m = cookie.match(/(?:^|; )session=([^;]+)/);
      if (!m) return json({ error: 'not_authenticated' }, 401, cors);
      const payload = await verifyJWT(m[1], env.SESSION_SECRET);
      if (!payload) return json({ error: 'invalid_session' }, 401, cors);
      let body;
      try { body = await request.json(); } catch (e) { return json({ error: 'invalid_json' }, 400, cors); }
      const { repo, base = 'main', branch, files, title } = body;
      if (!repo || !branch || !files || !title) return json({ error: 'missing_fields' }, 400, cors);
      const ghToken = payload.gh_token;
      const headers = {
        Authorization: `token ${ghToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'cf-github-proxy'
      };
      // get base ref sha
      const refRes = await fetch(`${GITHUB_API}/repos/${repo}/git/ref/heads/${base}`, { headers });
      if (!refRes.ok) return json({ error: 'base_ref_not_found' }, 400, cors);
      const refJson = await refRes.json();
      const baseSha = refJson.object.sha;
      // create branch
      const createRefRes = await fetch(`${GITHUB_API}/repos/${repo}/git/refs`, {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, headers),
        body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseSha })
      });
      if (!createRefRes.ok) return json({ error: 'create_branch_failed' }, 400, cors);
      // create blobs and tree
      const blobEntries = [];
      for (const f of files) {
        const blobRes = await fetch(`${GITHUB_API}/repos/${repo}/git/blobs`, {
          method: 'POST',
          headers: Object.assign({ 'Content-Type': 'application/json' }, headers),
          body: JSON.stringify({ content: f.content, encoding: 'utf-8' })
        });
        if (!blobRes.ok) return json({ error: 'blob_failed' }, 400, cors);
        const blobJson = await blobRes.json();
        blobEntries.push({ path: f.path, mode: '100644', type: 'blob', sha: blobJson.sha });
      }
      const treeRes = await fetch(`${GITHUB_API}/repos/${repo}/git/trees`, {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, headers),
        body: JSON.stringify({ base_tree: baseSha, tree: blobEntries })
      });
      if (!treeRes.ok) return json({ error: 'tree_failed' }, 400, cors);
      const treeJson = await treeRes.json();
      const commitRes = await fetch(`${GITHUB_API}/repos/${repo}/git/commits`, {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, headers),
        body: JSON.stringify({ message: title, tree: treeJson.sha, parents: [baseSha] })
      });
      if (!commitRes.ok) return json({ error: 'commit_failed' }, 400, cors);
      const commitJson = await commitRes.json();
      const updateRefRes = await fetch(`${GITHUB_API}/repos/${repo}/git/refs/heads/${branch}`, {
        method: 'PATCH',
        headers: Object.assign({ 'Content-Type': 'application/json' }, headers),
        body: JSON.stringify({ sha: commitJson.sha })
      });
      if (!updateRefRes.ok) return json({ error: 'update_ref_failed' }, 400, cors);
      const prRes = await fetch(`${GITHUB_API}/repos/${repo}/pulls`, {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, headers),
        body: JSON.stringify({ title, head: branch, base })
      });
      if (!prRes.ok) return json({ error: 'pr_failed' }, 400, cors);
      const prJson = await prRes.json();
      return json({ pr: prJson.html_url }, 200, cors);
    }

    return new Response('Not Found', { status: 404, headers: cors });
  }
};