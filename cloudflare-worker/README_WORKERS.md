This folder contains Cloudflare Workers used by the site.

Structure:
- oauth-proxy/        : OAuth proxy worker for Decap CMS (worker.mjs + wrangler.toml)
- shop-counter/      : Worker implementing a Durable Object counter (worker.mjs + wrangler.toml)

Notes:
- Each worker has its own `wrangler.toml`; deploy from the subdirectory:

  cd cloudflare-worker/oauth-proxy && wrangler publish
  cd cloudflare-worker/shop-counter && wrangler publish

- The top-level `wrangler.toml` (if present) is not used; avoid running `wrangler publish` from the top-level `cloudflare-worker` directory to prevent accidental publishes.

- After publishing `shop-counter`, set `COUNTER_WORKER_BASE` in `src/components/shops/ShopExplorer.astro` to the published worker URL (no trailing slash), or configure a Cloudflare route to map `/api/shop-counter` to the worker.

If you want, I can:
- remove the top-level `wrangler.toml`, or
- consolidate workers into one project (not recommended).
