/**
 * Temporary final-gate pagination probe (not for commit).
 * Usage: node .playwright-output/pagination-profile.mjs
 */
const BACKEND =
  process.env.PLAYWRIGHT_BACKEND_URL?.replace(/\/$/, "") ??
  "http://127.0.0.1:8000/api/v1";
const TRACE_ID = process.env.PAG_PROFILE_TRACE ?? `pag-profile-${Date.now()}`;

function pct(sorted, p) {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)] ?? null;
}

async function continuationBatch(exclude, seed, attempt, clientTimeoutMs) {
  const t0 = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), clientTimeoutMs);
  let status = 0;
  let error = null;
  try {
    const res = await fetch(`${BACKEND}/contents/feed/batch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-explore-trace-id": TRACE_ID,
        "x-explore-attempt": String(attempt),
      },
      body: JSON.stringify({
        excludeChannelIds: exclude,
        count: 8,
        feedMode: "trends",
        ...(seed ? { seed } : {}),
      }),
      signal: controller.signal,
    });
    status = res.status;
    const data = await res.json();
    clearTimeout(timer);
    return {
      ok: true,
      ms: Math.round(performance.now() - t0),
      status,
      seed: data.seed,
      items: Array.isArray(data.items) ? data.items : [],
      aborted: false,
    };
  } catch (e) {
    clearTimeout(timer);
    error = e?.name ?? "Error";
    return {
      ok: false,
      ms: Math.round(performance.now() - t0),
      status,
      aborted: error === "AbortError",
      error,
      items: [],
    };
  }
}

async function profileContinuations(n = 30) {
  const latencies = [];
  let seed = "";
  const exclude = [];
  let count429 = 0;
  let count500 = 0;
  let countTimeout = 0;

  for (let i = 0; i < n; i++) {
    const r = await continuationBatch(exclude, seed, i + 1, 30_000);
    latencies.push(r.ms);
    if (r.status === 429) count429++;
    if (r.status >= 500) count500++;
    if (r.aborted || r.error === "TimeoutError") countTimeout++;
    if (r.seed) seed = r.seed;
    for (const it of r.items) {
      if (it?.id && !exclude.includes(it.id)) exclude.push(it.id);
    }
    await new Promise(res => setTimeout(res, 1500));
  }

  const sorted = [...latencies].sort((a, b) => a - b);
  return {
    traceId: TRACE_ID,
    samples: n,
    min: sorted[0],
    median: pct(sorted, 50),
    p90: pct(sorted, 90),
    p95: pct(sorted, 95),
    max: sorted[sorted.length - 1],
    count429,
    count500,
    countTimeout,
    latencies: sorted,
  };
}

/** Overlap probe: abort attempt 1 early, start attempt 2 immediately. */
async function overlapProbe() {
  const trace = `${TRACE_ID}-overlap`;
  const exclude = ["00000000-0000-4000-8000-000000000001"];
  const attempt1 = continuationBatch(exclude, "", 1, 500);
  await new Promise(r => setTimeout(r, 50));
  const attempt2 = continuationBatch(exclude, "", 2, 30_000);
  const [a1, a2] = await Promise.all([attempt1, attempt2]);
  return {
    traceId: trace,
    attempt1: {
      ms: a1.ms,
      aborted: a1.aborted,
      status: a1.status,
    },
    attempt2: {
      ms: a2.ms,
      ok: a2.ok,
      status: a2.status,
    },
    note: "Check backend logs for explore_batch_stage overlapWithPriorAttempt:true on attempt 2",
  };
}

const profile = await profileContinuations(30);
console.log(JSON.stringify({ phase: "profile_30", ...profile }));

const overlap = await overlapProbe();
console.log(JSON.stringify({ phase: "overlap_probe", ...overlap }));
