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
        state
      });
      return redirect(`${GITHUB_AUTHORIZE}?${params.toString()}`);
    }

    if (path === '/auth/callback') {
      const code = url.searchParams.get('code');
      if (!code) return json({ error: 'missing_code' }, 400);
      const tokenRes = await fetch(GITHUB_TOKEN, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code
        })
      });
      const tokenJson = await tokenRes.json();
      if (tokenJson.error) return json({ error: 'token_exchange_failed', detail: tokenJson }, 400);
      const session = await makeJWT({ gh_token: tokenJson.access_token }, env.SESSION_SECRET, 60 * 60);
      // Redirect target: use ADMIN_URL env var if set (e.g. your GitHub Pages admin URL),
      // otherwise fall back to the worker's /admin/ path.
      const adminUrl = env.ADMIN_URL || '/admin/';
      const res = redirect(adminUrl);
      const cookie = `session=${session}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${60 * 60}`;
      res.headers.set('Set-Cookie', cookie);
      return res;
    }

    if (path === '/api/whoami') {
      const cookie = request.headers.get('Cookie') || '';
      const m = cookie.match(/(?:^|; )session=([^;]+)/);
      if (!m) return json({ authenticated: false });
      const payload = await verifyJWT(m[1], env.SESSION_SECRET);
      if (!payload) return json({ authenticated: false });
      return json({ authenticated: true, user: payload });
    }

    if (path === '/api/create-pr' && request.method === 'POST') {
      const cookie = request.headers.get('Cookie') || '';
      const m = cookie.match(/(?:^|; )session=([^;]+)/);
      if (!m) return json({ error: 'not_authenticated' }, 401);
      const payload = await verifyJWT(m[1], env.SESSION_SECRET);
      if (!payload) return json({ error: 'invalid_session' }, 401);
      let body;
      try { body = await request.json(); } catch (e) { return json({ error: 'invalid_json' }, 400); }
      const { repo, base = 'main', branch, files, title } = body;
      if (!repo || !branch || !files || !title) return json({ error: 'missing_fields' }, 400);
      const ghToken = payload.gh_token;
      const headers = {
        Authorization: `token ${ghToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'cf-github-proxy'
      };
      // get base ref sha
      const refRes = await fetch(`${GITHUB_API}/repos/${repo}/git/ref/heads/${base}`, { headers });
      if (!refRes.ok) return json({ error: 'base_ref_not_found' }, 400);
      const refJson = await refRes.json();
      const baseSha = refJson.object.sha;
      // create branch
      const createRefRes = await fetch(`${GITHUB_API}/repos/${repo}/git/refs`, {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, headers),
        body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseSha })
      });
      if (!createRefRes.ok) return json({ error: 'create_branch_failed' }, 400);
      // create blobs and tree
      const blobEntries = [];
      for (const f of files) {
        const blobRes = await fetch(`${GITHUB_API}/repos/${repo}/git/blobs`, {
          method: 'POST',
          headers: Object.assign({ 'Content-Type': 'application/json' }, headers),
          body: JSON.stringify({ content: f.content, encoding: 'utf-8' })
        });
        if (!blobRes.ok) return json({ error: 'blob_failed' }, 400);
        const blobJson = await blobRes.json();
        blobEntries.push({ path: f.path, mode: '100644', type: 'blob', sha: blobJson.sha });
      }
      const treeRes = await fetch(`${GITHUB_API}/repos/${repo}/git/trees`, {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, headers),
        body: JSON.stringify({ base_tree: baseSha, tree: blobEntries })
      });
      if (!treeRes.ok) return json({ error: 'tree_failed' }, 400);
      const treeJson = await treeRes.json();
      const commitRes = await fetch(`${GITHUB_API}/repos/${repo}/git/commits`, {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, headers),
        body: JSON.stringify({ message: title, tree: treeJson.sha, parents: [baseSha] })
      });
      if (!commitRes.ok) return json({ error: 'commit_failed' }, 400);
      const commitJson = await commitRes.json();
      const updateRefRes = await fetch(`${GITHUB_API}/repos/${repo}/git/refs/heads/${branch}`, {
        method: 'PATCH',
        headers: Object.assign({ 'Content-Type': 'application/json' }, headers),
        body: JSON.stringify({ sha: commitJson.sha })
      });
      if (!updateRefRes.ok) return json({ error: 'update_ref_failed' }, 400);
      const prRes = await fetch(`${GITHUB_API}/repos/${repo}/pulls`, {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, headers),
        body: JSON.stringify({ title, head: branch, base })
      });
      if (!prRes.ok) return json({ error: 'pr_failed' }, 400);
      const prJson = await prRes.json();
      return json({ pr: prJson.html_url });
    }

    return new Response('Not Found', { status: 404 });
  }
};