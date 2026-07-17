"use client";

import { useEffect } from "react";
import { reportWebVitals } from "@/lib/web-vitals";

type WebVitalMetric = {
  name: string;
  value: number;
  id: string;
  rating?: "good" | "needs-improvement" | "poor";
};

export function WebVitalsReporter() {
  useEffect(() => {
    let cancelled = false;

    void import("web-vitals")
      .then(({ onCLS, onINP, onLCP, onFCP, onTTFB }) => {
        if (cancelled) return;
        const forward = (metric: WebVitalMetric) => reportWebVitals(metric);
        onCLS(forward);
        onINP(forward);
        onLCP(forward);
        onFCP(forward);
        onTTFB(forward);
      })
      .catch(() => {
        /* web-vitals optional at runtime */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
