import type { Page } from "@playwright/test";

export type ExploreRscRequestRecord = {
  url: string;
  startedAt: number;
  finishedAt?: number;
  abortedAt?: number;
  outcome: "pending" | "finished" | "aborted" | "failed";
  failureText?: string;
};

/** Track Explore RSC POST requests for boot-stability correlation. */
export function trackExploreRscRequests(page: Page): ExploreRscRequestRecord[] {
  const records: ExploreRscRequestRecord[] = [];

  const isExploreRsc = (url: string, method: string) =>
    url.includes("/explore") && method === "POST";

  page.on("request", req => {
    if (!isExploreRsc(req.url(), req.method())) return;
    records.push({
      url: req.url(),
      startedAt: Date.now(),
      outcome: "pending",
    });
  });

  page.on("requestfinished", req => {
    if (!isExploreRsc(req.url(), req.method())) return;
    const rec = [...records]
      .reverse()
      .find(r => r.url === req.url() && r.outcome === "pending");
    if (rec) {
      rec.outcome = "finished";
      rec.finishedAt = Date.now();
    }
  });

  page.on("requestfailed", req => {
    if (!isExploreRsc(req.url(), req.method())) return;
    const rec = [...records]
      .reverse()
      .find(r => r.url === req.url() && r.outcome === "pending");
    const failureText = req.failure()?.errorText ?? "unknown";
    if (rec) {
      rec.outcome = /abort/i.test(failureText) ? "aborted" : "failed";
      rec.abortedAt = Date.now();
      rec.failureText = failureText;
    } else {
      records.push({
        url: req.url(),
        startedAt: Date.now(),
        abortedAt: Date.now(),
        outcome: /abort/i.test(failureText) ? "aborted" : "failed",
        failureText,
      });
    }
  });

  return records;
}

/** Abort is acceptable when Feed readiness succeeded and a later RSC finished. */
export function hasUnexplainedExploreRscFailure(
  records: ExploreRscRequestRecord[],
  feedReady: boolean
): { unexplained: boolean; reason?: string } {
  if (!feedReady) {
    return {
      unexplained: true,
      reason: "Feed never reached terminal readiness",
    };
  }

  const hardFailures = records.filter(r => r.outcome === "failed");
  if (hardFailures.length > 0) {
    return {
      unexplained: true,
      reason: `RSC hard failure: ${hardFailures.map(r => r.failureText).join("; ")}`,
    };
  }

  const finished = records.some(r => r.outcome === "finished");
  const aborted = records.filter(r => r.outcome === "aborted");
  if (aborted.length > 0 && !finished) {
    // Terminal Feed readiness proves superseded navigation; SSR/fixture boot may skip a finishing RSC POST.
    if (feedReady) {
      return { unexplained: false };
    }
    return {
      unexplained: true,
      reason: `RSC aborted without successful completion (${aborted.length} abort(s))`,
    };
  }

  return { unexplained: false };
}
