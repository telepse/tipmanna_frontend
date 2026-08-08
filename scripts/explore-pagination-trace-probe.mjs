#!/usr/bin/env node
/**
 * One-shot live-backend pagination correlation probe (no secrets).
 * Usage: node scripts/explore-pagination-trace-probe.mjs
 */
const FRONTEND =
  process.env.PLAYWRIGHT_BASE_URL ??
  "https://tipmanna-fj3ffgvfq-test01.vercel.app";
const BACKEND =
  process.env.PLAYWRIGHT_BACKEND_URL ??
  "https://tipmanna-server.onrender.com/api/v1";

async function boot() {
  const t0 = Date.now();
  const res = await fetch(`${BACKEND}/contents/feed/batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ count: 8, feedMode: "trends" }),
  });
  const body = await res.json();
  return {
    ms: Date.now() - t0,
    seed: body.seed,
    ids: (body.items ?? []).map(x => x.id),
  };
}

async function continuation(exclude, seed, traceId, attempt) {
  const t0 = Date.now();
  const res = await fetch(`${BACKEND}/contents/feed/batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-explore-trace-id": traceId,
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
    ms: Date.now() - t0,
    status: res.status,
    stage: res.headers.get("x-explore-coalesce-stage"),
    keyHash: res.headers.get("x-explore-coalesce-key-hash"),
    instanceId: res.headers.get("x-explore-coalesce-instance"),
    cacheReadTier: res.headers.get("x-explore-cache-read-tier"),
    cacheWriteTier: res.headers.get("x-explore-cache-write-tier"),
    itemCount: Array.isArray(body.items) ? body.items.length : 0,
  };
}

const traceId = `trace-probe-${Date.now()}`;
const b = await boot();
const c1 = await continuation(b.ids, b.seed, traceId, 1);
await new Promise(r => setTimeout(r, 1500));
const c2 = await continuation(b.ids, b.seed, traceId, 2);

console.info(
  JSON.stringify(
    {
      traceId,
      frontend: FRONTEND.replace(/\/$/, ""),
      backend: BACKEND.replace(/\/$/, ""),
      bootMs: b.ms,
      bootCount: b.ids.length,
      cycle1: c1,
      cycle2: c2,
      sameKeyHash: c1.keyHash != null && c1.keyHash === c2.keyHash,
      crossInstance:
        c1.instanceId != null &&
        c2.instanceId != null &&
        c1.instanceId !== c2.instanceId,
    },
    null,
    2
  )
);
