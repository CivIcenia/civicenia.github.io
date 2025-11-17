// javascript
// Usage:
//   SESSION_SECRET=your_session_secret GH_TOKEN=your_personal_token node make_session.js

const crypto = globalThis.crypto || require('crypto').webcrypto;
const encoder = new TextEncoder();

function base64UrlEncode(bytes) {
  let s = '';
  const view = new Uint8Array(bytes);
  for (let i = 0; i < view.length; i++) s += String.fromCharCode(view[i]);
  return Buffer.from(s, 'binary').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmacSha256(data, key) {
  const k = await crypto.subtle.importKey('raw', encoder.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, encoder.encode(data));
  return new Uint8Array(sig);
}

async function makeJWT(payloadObj, secret, expSeconds = 3600) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = Object.assign({ iat: now, exp: now + expSeconds }, payloadObj);
  const header64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payload64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const toSign = `${header64}.${payload64}`;
  const sig = await hmacSha256(toSign, secret);
  const sig64 = base64UrlEncode(sig);
  return `${toSign}.${sig64}`;
}

(async () => {
  const secret = process.env.SESSION_SECRET;
  const ghToken = process.env.GH_TOKEN;
  if (!secret || !ghToken) {
    console.error('Provide SESSION_SECRET and GH_TOKEN in env vars');
    process.exit(2);
  }
  const token = await makeJWT({ gh_token: ghToken }, secret, 3600);
  console.log('Session cookie value:');
  console.log(token);
})();