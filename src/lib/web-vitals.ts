"use client";

type VitalMetric = {
  name: string;
  value: number;
  id: string;
  rating?: "good" | "needs-improvement" | "poor";
};

const CUSTOM_MARKS = [
  "explore-first-playable",
  "explore-home-interactive",
] as const;

export type CustomPerfMark = (typeof CUSTOM_MARKS)[number];

export function markExplorePerf(name: CustomPerfMark): void {
  if (typeof performance === "undefined") return;
  performance.mark(name);
  if (process.env.NODE_ENV !== "production") {
    console.info(`[perf] ${name} @ ${Math.round(performance.now())}ms`);
  }
}

export function reportWebVitals(metric: VitalMetric): void {
  if (typeof window === "undefined") return;
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    id: metric.id,
    rating: metric.rating,
    path: window.location.pathname,
  });
  if (process.env.NODE_ENV !== "production") {
    console.info("[web-vitals]", body);
  }
  if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
    try {
      navigator.sendBeacon("/api/perf-vitals", body);
    } catch {
      /* optional endpoint */
    }
  }
}

export function measureExploreBoot(): void {
  if (typeof performance === "undefined") return;
  try {
    const nav = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (nav) {
      markExplorePerf("explore-home-interactive");
    }
  } catch {
    /* ignore */
  }
}
