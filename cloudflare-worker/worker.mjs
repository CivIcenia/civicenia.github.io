// This file was moved to ./oauth-proxy/worker.mjs
// Keep this placeholder to avoid accidental publishes from the root folder.
export default {
  async fetch() {
    return new Response('See cloudflare-worker/oauth-proxy for the OAuth proxy worker.', { status: 200 });
  }
};