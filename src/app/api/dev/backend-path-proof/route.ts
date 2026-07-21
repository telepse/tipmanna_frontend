import dns from "node:dns/promises";
import net from "node:net";
import { NextResponse } from "next/server";
import { EXPLORE_FEED_CLIENT_FETCH_TIMEOUT_MS } from "@/lib/explore-feed-fetch-timeout";

export const dynamic = "force-dynamic";

type FetchOutcome = {
  ok: boolean;
  ms: number;
  status?: number;
  errorCode?: string;
  errorMessage?: string;
};

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

function stats(values: number[]) {
  if (values.length === 0) {
    return { min: 0, median: 0, max: 0 };
  }
  return {
    min: Math.min(...values),
    median: median(values),
    max: Math.max(...values),
  };
}

async function timedFetch(
  url: string,
  init?: RequestInit
): Promise<FetchOutcome> {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      ...init,
      cache: "no-store",
    });
    return {
      ok: res.ok,
      ms: Date.now() - start,
      status: res.status,
    };
  } catch (e) {
    const err = e as Error & { cause?: { code?: string }; code?: string };
    return {
      ok: false,
      ms: Date.now() - start,
      errorCode: err.cause?.code ?? err.code,
      errorMessage: err.message,
    };
  }
}

async function runSequential(
  healthUrl: string,
  feedUrl: string,
  healthCount: number,
  feedCount: number
) {
  const health: FetchOutcome[] = [];
  for (let i = 0; i < healthCount; i++) {
    health.push(await timedFetch(healthUrl));
  }
  const feed: FetchOutcome[] = [];
  for (let i = 0; i < feedCount; i++) {
    feed.push(
      await timedFetch(feedUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          excludeChannelIds: [],
          count: 3,
          feedMode: "trends",
        }),
        signal: AbortSignal.timeout(EXPLORE_FEED_CLIENT_FETCH_TIMEOUT_MS),
      })
    );
  }
  return { health, feed };
}

async function runConcurrent(
  healthUrl: string,
  feedUrl: string,
  healthCount: number,
  feedCount: number
) {
  const health = await Promise.all(
    Array.from({ length: healthCount }, () => timedFetch(healthUrl))
  );
  const feed = await Promise.all(
    Array.from({ length: feedCount }, () =>
      timedFetch(feedUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          excludeChannelIds: [],
          count: 3,
          feedMode: "trends",
        }),
        signal: AbortSignal.timeout(EXPLORE_FEED_CLIENT_FETCH_TIMEOUT_MS),
      })
    )
  );
  return { health, feed };
}

function summarize(label: string, outcomes: FetchOutcome[]) {
  const ok = outcomes.filter(o => o.ok).length;
  const fail = outcomes.length - ok;
  const durations = outcomes.map(o => o.ms);
  const errorCounts: Record<string, number> = {};
  for (const o of outcomes) {
    if (!o.ok && o.errorCode) {
      errorCounts[o.errorCode] = (errorCounts[o.errorCode] ?? 0) + 1;
    }
  }
  return {
    label,
    pass: ok,
    fail,
    total: outcomes.length,
    duration: stats(durations),
    errorCounts,
  };
}

async function resolveLocalhost() {
  try {
    const addresses = await dns.lookup("localhost", { all: true });
    return addresses.map(
      a => `${a.address} (${a.family === 6 ? "IPv6" : "IPv4"})`
    );
  } catch (e) {
    return [`lookup failed: ${e instanceof Error ? e.message : String(e)}`];
  }
}

function probePort(host: string, port: number): Promise<boolean> {
  return new Promise(resolve => {
    const socket = net.connect({ host, port, timeout: 500 });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

/** Dev-only: probe backend reachability from the Next.js server process. */
export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "unavailable" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const mode =
    searchParams.get("mode") === "concurrent" ? "concurrent" : "sequential";
  const healthCount = Number.parseInt(searchParams.get("health") ?? "50", 10);
  const feedCount = Number.parseInt(searchParams.get("feed") ?? "20", 10);

  const apiBase =
    process.env.NEXT_PUBLIC_BACKEND_API_URL?.replace(/\/$/, "") ?? "";
  let parsed: URL | null = null;
  try {
    parsed = apiBase ? new URL(apiBase) : null;
  } catch {
    parsed = null;
  }

  const backendRoot = apiBase.replace(/\/api\/v1\/?$/, "");
  const healthUrl = `${backendRoot.replace(/\/$/, "")}/health`;
  const feedUrl = `${apiBase}/contents/feed/batch`;

  const localhostVs127 = {
    "http://localhost:8000/health": await timedFetch(
      "http://localhost:8000/health"
    ),
    "http://127.0.0.1:8000/health": await timedFetch(
      "http://127.0.0.1:8000/health"
    ),
  };

  const run = mode === "concurrent" ? runConcurrent : runSequential;
  const { health, feed } = await run(
    healthUrl,
    feedUrl,
    healthCount,
    feedCount
  );

  const concurrentFeedBoot = await Promise.all(
    Array.from({ length: 20 }, () =>
      timedFetch(feedUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          excludeChannelIds: [],
          count: 6,
          feedMode: "trends",
        }),
        signal: AbortSignal.timeout(EXPLORE_FEED_CLIENT_FETCH_TIMEOUT_MS),
      })
    )
  );

  return NextResponse.json({
    prefix: "[backend-path-proof]",
    mode,
    effectiveEnv: {
      NEXT_PUBLIC_BACKEND_API_URL: apiBase,
      protocol: parsed?.protocol ?? null,
      hostname: parsed?.hostname ?? null,
      port: parsed?.port || (parsed?.protocol === "https:" ? "443" : "80"),
    },
    targetUrls: { healthUrl, feedUrl },
    localhostResolution: await resolveLocalhost(),
    portProbes: {
      localhost8000: await probePort("localhost", 8000),
      "127.0.0.1:8000": await probePort("127.0.0.1", 8000),
      "::1:8000": await probePort("::1", 8000),
    },
    localhostVs127Diagnostic: localhostVs127,
    sequentialOrConcurrent: {
      health: summarize("health", health),
      feed: summarize("feed", feed),
    },
    concurrentFeedBoot: summarize("concurrent-feed-boot", concurrentFeedBoot),
    process: { pid: process.pid, nodeEnv: process.env.NODE_ENV },
  });
}
