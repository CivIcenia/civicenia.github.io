// javascript
// Run end-to-end test against worker: generates session cookie and calls whoami + create-pr
const { webcrypto } = require('crypto');
const encoder = new TextEncoder();

function base64UrlEncode(bytes) {
  if (bytes instanceof Uint8Array) bytes = Buffer.from(bytes);
  return Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmacSha256(data, key) {
  const k = await webcrypto.subtle.importKey('raw', encoder.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await webcrypto.subtle.sign('HMAC', k, encoder.encode(data));
  return new Uint8Array(sig);
}

async function makeJWT(payloadObj, secret, expSeconds = 3600) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = Object.assign({ iat: now, exp: now + expSeconds }, payloadObj);
  const header64 = base64UrlEncode(Buffer.from(JSON.stringify(header)));
  const payload64 = base64UrlEncode(Buffer.from(JSON.stringify(payload)));
  const toSign = `${header64}.${payload64}`;
  const sig = await hmacSha256(toSign, secret);
  const sig64 = base64UrlEncode(sig);
  return `${toSign}.${sig64}`;
}

(async () => {
  const SESSION_SECRET = process.env.SESSION_SECRET;
  const GH_TOKEN = process.env.GH_TOKEN;
  const WORKER = process.env.WORKER_DOMAIN || 'https://cf-github-proxy.icenia-auth.workers.dev';
  const REPO = process.env.REPO || 'creepilycreeper/civicenia.github.io';

  if (!SESSION_SECRET || !GH_TOKEN) {
    console.error('Require SESSION_SECRET and GH_TOKEN env vars.');
    process.exit(2);
  }

  const session = await makeJWT({ gh_token: GH_TOKEN }, SESSION_SECRET, 3600);
  console.log('Generated session token (paste into Cookie header if needed):');
  console.log(session);

  // whoami
  try {
    const whoamiRes = await fetch(`${WORKER}/api/whoami`, { headers: { Cookie: `session=${session}` } });
    const whoamiJson = await whoamiRes.json();
    console.log('whoami response:', JSON.stringify(whoamiJson));
  } catch (e) {
    console.error('whoami request failed', e);
    process.exit(3);
  }

  // create-pr
  const branch = process.env.BRANCH || `cms-e2e-${Date.now()}`;
  const payload = {
    repo: REPO,
    base: 'main',
    branch,
    title: 'e2e: add tmp file from run_e2e.js',
    files: [{ path: `tmp/e2e-${Date.now()}.txt`, content: 'hello from e2e test' }]
  };

  try {
    const prRes = await fetch(`${WORKER}/api/create-pr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `session=${session}` },
      body: JSON.stringify(payload)
    });
    const prJson = await prRes.json();
    console.log('create-pr response:', JSON.stringify(prJson));
    if (prJson.pr) process.exit(0);
    else process.exit(4);
  } catch (e) {
    console.error('create-pr request failed', e);
    process.exit(5);
  }
})();