"use client";

import { TvLooperSkeleton } from "@/components/tv/tv-loading-skeletons";

/** Client Suspense fallback for /tv cold boot. */
export function TvPageSuspenseFallback() {
  return (
    <div className="w-full space-y-3 p-2">
      <TvLooperSkeleton layout="wide" />
      <p className="text-muted-foreground text-center text-sm">Loading TV…</p>
    </div>
  );
}
