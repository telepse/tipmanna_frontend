"use client";

import { useEffect } from "react";
import { TvLooperSkeleton } from "@/components/tv/tv-loading-skeletons";
import { tvLoadMark } from "@/lib/tvDebugLog";

/** Client Suspense fallback for /tv cold boot. */
export function TvPageSuspenseFallback() {
  useEffect(() => {
    tvLoadMark("T1", { source: "TvPageSuspenseFallback" });
  }, []);

  return (
    <div className="w-full space-y-3 p-2">
      <TvLooperSkeleton layout="wide" />
      <p className="text-muted-foreground text-center text-sm">Loading TV…</p>
    </div>
  );
}
