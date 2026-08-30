#!/usr/bin/env node
/** Prove Redis read tier on cross-instance continuation retry. */
const BACKEND =
  process.env.PLAYWRIGHT_BACKEND_URL ??
  "https://tipmanna-server.onrender.com/api/v1";

async function boot() {
  const res = await fetch(`${BACKEND}/contents/feed/batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ count: 8, feedMode: "trends" }),
  });
  const body = await res.json();
  return {
    seed: body.seed,
    ids: (body.items ?? []).map(x => x.id),
  };
}

async function continuation(exclude, seed, attempt) {
  const res = await fetch(`${BACKEND}/contents/feed/batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-explore-attempt": String(attempt),
    },
    body: JSON.stringify({
      count: 6,
      feedMode: "trends",
      seed,
      excludeChannelIds: exclude,
    }),
  });
  const body = await res.json();
  return {
    status: res.status,
    stage: res.headers.get("x-explore-coalesce-stage"),
    keyHash: res.headers.get("x-explore-coalesce-key-hash"),
    instanceId: res.headers.get("x-explore-coalesce-instance"),
    cacheReadTier: res.headers.get("x-explore-cache-read-tier"),
    cacheWriteTier: res.headers.get("x-explore-cache-write-tier"),
    itemCount: Array.isArray(body.items) ? body.items.length : 0,
  };
}

const b = await boot();
const c1 = await continuation(b.ids, b.seed, 1);
await new Promise(r => setTimeout(r, 400));
const retries = await Promise.all(
  Array.from({ length: 8 }, (_, i) => continuation(b.ids, b.seed, i + 2))
);
const redisRetry = retries.find(r => r.cacheReadTier === "redis");
const crossInstance = retries.filter(
  r => r.instanceId && c1.instanceId && r.instanceId !== c1.instanceId
);

console.info(
  JSON.stringify(
    {
      cycle1: c1,
      retryTiers: [...new Set(retries.map(r => r.cacheReadTier))],
      crossInstanceRetries: crossInstance.length,
      redisReadRetry: redisRetry ?? null,
      allRecentCache: retries.every(r => r.stage === "coalesced_recent_cache"),
      dbExecutions: c1.stage === "coalesced_new" ? 1 : "unexpected",
    },
    null,
    2
  )
);
