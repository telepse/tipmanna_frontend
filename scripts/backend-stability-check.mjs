/**
 * Direct backend stability probe (Node process, not via Next.js).
 * Usage: node scripts/backend-stability-check.mjs
 */
const BACKEND = process.env.PLAYWRIGHT_BACKEND_URL ?? "http://localhost:8000";
const healthUrl = `${BACKEND.replace(/\/$/, "")}/health`;
const feedUrl = `${BACKEND.replace(/\/$/, "")}/api/v1/contents/feed/batch`;

const HEALTH_RUNS = 50;
const FEED_RUNS = 20;

async function timedFetch(url, init) {
  const start = performance.now();
  try {
    const res = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(30_000),
    });
    const ms = Math.round(performance.now() - start);
    return { ok: res.ok, status: res.status, ms };
  } catch (e) {
    const err = e;
    return {
      ok: false,
      ms: Math.round(performance.now() - start),
      errorCode: err?.cause?.code ?? err?.code,
      errorMessage: err instanceof Error ? err.message : String(err),
    };
  }
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

function stats(times) {
  const ms = times.map(t => t.ms);
  return {
    pass: times.filter(t => t.ok).length,
    fail: times.filter(t => !t.ok).length,
    min: Math.min(...ms),
    median: median(ms),
    max: Math.max(...ms),
    errors: times
      .filter(t => !t.ok)
      .reduce((acc, t) => {
        const key = t.errorCode ?? `HTTP_${t.status ?? "?"}`;
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {}),
  };
}

const healthTimes = [];
for (let i = 0; i < HEALTH_RUNS; i++) {
  healthTimes.push(await timedFetch(healthUrl));
}

const feedTimes = [];
for (let i = 0; i < FEED_RUNS; i++) {
  feedTimes.push(
    await timedFetch(feedUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limit: 3, offset: 0, feedSubTab: "trends" }),
    })
  );
}

const healthSummary = stats(healthTimes);
const feedSummary = stats(feedTimes);

console.info("BACKEND_STABILITY", {
  healthUrl,
  feedUrl,
  health: healthSummary,
  feed: feedSummary,
});

if (healthSummary.pass !== HEALTH_RUNS || feedSummary.pass !== FEED_RUNS) {
  process.exit(1);
}

console.info("BACKEND_STABILITY_OK");
