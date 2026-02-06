// Shop counter worker with Durable Object
// Exposes /api/shop-counter for GET (read) and GET ?hit=1 or POST (increment)

export class Counter {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.count = 0;
    this.loaded = false;

    this.state.blockConcurrencyWhile(async () => {
      const v = await this.state.storage.get('count');
      this.count = (typeof v === 'number') ? v : 0;
      this.loaded = true;
    });
  }

  async fetch(req) {
    // Restrict CORS to allowed origins
    const allowed = [
      'https://civicenia.github.io',
      'https://www.civicenia.github.io',
      'https://icenia.org',
      'https://www.icenia.org'
    ];

    const origin = req.headers.get('Origin');
    const acao = (origin && allowed.includes(origin)) ? origin : null;

    const baseHeaders = {
      'Content-Type': 'application/json'
    };

    if (req.method === 'OPTIONS') {
      // Preflight response
      const headers = new Headers(baseHeaders);
      if (acao) {
        headers.set('Access-Control-Allow-Origin', acao);
        headers.set('Vary', 'Origin');
        headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        headers.set('Access-Control-Allow-Headers', 'Content-Type');
      }
      return new Response(null, { status: 204, headers });
    }

    const url = new URL(req.url);
    const doHit = req.method === 'POST' || url.searchParams.has('hit');

    // Determine client key: prefer clientId in body, otherwise use CF connecting IP
    let clientId = null;
    let requestId = null;
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        clientId = body.clientId || null;
        requestId = body.requestId || null;
      } catch (e) {
        // ignore parse errors
      }
    } else {
      // support GET ?clientId=..&requestId=.. for compatibility
      clientId = url.searchParams.get('clientId') || null;
      requestId = url.searchParams.get('requestId') || null;
    }

    const cfIp = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || 'unknown';
    const clientKey = clientId || `ip:${cfIp}`;

    // Simple token-bucket per clientKey to allow bursts
    const BUCKET_CAPACITY = 5; // allow burst up to 5
    const RATE_PER_SECOND = 1;  // refill 1 token per second

    // Load bucket state for client
    const bucketKey = `bucket:${clientKey}`;
    let bucket = await this.state.storage.get(bucketKey);
    const now = Date.now();
    if (!bucket) {
      bucket = { tokens: BUCKET_CAPACITY, last: now };
    } else {
      // refill
      const elapsed = (now - (bucket.last || now)) / 1000;
      const refill = elapsed * RATE_PER_SECOND;
      bucket.tokens = Math.min(BUCKET_CAPACITY, (bucket.tokens || 0) + refill);
      bucket.last = now;
    }

    // Manage recent request IDs (to dedupe duplicates) per client to limit size
    const RECENT_REQS_KEY = `recentReqs:${clientKey}`;
    let recentReqs = await this.state.storage.get(RECENT_REQS_KEY) || {};
    // prune entries older than 60s and enforce max entries
    const PRUNE_MS = 60 * 1000;
    const MAX_RECENT_ENTRIES = 50;
    for (const [k, t] of Object.entries(recentReqs)) {
      if ((now - t) > PRUNE_MS) delete recentReqs[k];
    }
    // enforce size cap by removing oldest entries if needed
    const keys = Object.keys(recentReqs);
    if (keys.length > MAX_RECENT_ENTRIES) {
      const sorted = keys.sort((a, b) => recentReqs[a] - recentReqs[b]);
      const toRemove = sorted.slice(0, keys.length - MAX_RECENT_ENTRIES);
      for (const k of toRemove) delete recentReqs[k];
    }
    // persist pruned recentReqs back to storage so state doesn't grow indefinitely
    await this.state.storage.put(RECENT_REQS_KEY, recentReqs);

    if (doHit) {
      // If requestId supplied and already seen, return current value without increment
      if (requestId && recentReqs[requestId]) {
        // update bucket last to now to prevent rapid retries evading rate limits
        bucket.last = now;
        await this.state.storage.put(bucketKey, bucket);
        const headers = new Headers(baseHeaders);
        if (acao) { headers.set('Access-Control-Allow-Origin', acao); headers.set('Vary', 'Origin'); }
        return new Response(JSON.stringify({ value: this.count, throttled: false, duplicate: true }), { headers });
      }

      // Check tokens
      if ((bucket.tokens || 0) < 1) {
        // Not allowed: return throttled response without increment
        await this.state.storage.put(bucketKey, bucket);
        const headers = new Headers(baseHeaders);
        if (acao) { headers.set('Access-Control-Allow-Origin', acao); headers.set('Vary', 'Origin'); }
        return new Response(JSON.stringify({ value: this.count, throttled: true }), { status: 429, headers });
      }

      // consume token and increment
      bucket.tokens = (bucket.tokens || 0) - 1;
      bucket.last = now;
      this.count = (this.count || 0) + 1;
      recentReqs[requestId || `t${now}`] = now;

      // persist bucket and count and recentReqs
      await this.state.storage.put(bucketKey, bucket);
      await this.state.storage.put('count', this.count);
      await this.state.storage.put(RECENT_REQS_KEY, recentReqs);

      const headers = new Headers(baseHeaders);
      if (acao) { headers.set('Access-Control-Allow-Origin', acao); headers.set('Vary', 'Origin'); }
      return new Response(JSON.stringify({ value: this.count, throttled: false }), { headers });
    }

    const headers = new Headers(baseHeaders);
    if (acao) { headers.set('Access-Control-Allow-Origin', acao); headers.set('Vary', 'Origin'); }
    return new Response(JSON.stringify({ value: this.count }), { headers });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // route: /api/shop-counter
    if (path === '/api/shop-counter' || path.startsWith('/api/shop-counter/')) {
      // route to the named Durable Object instance
      try {
        const id = env.SHOP_COUNTER.idFromName('shop_explorer');
        const obj = env.SHOP_COUNTER.get(id);
        return obj.fetch(request);
      } catch (e) {
        return new Response(JSON.stringify({ error: 'DO error' }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      }
    }

    return new Response('Shop Counter Worker', { headers: { 'Content-Type': 'text/plain' } });
  }
};
