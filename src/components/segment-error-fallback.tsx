"use client";

import Link from "next/link";
import { useEffect } from "react";

import {
  hardReloadForLatestBuild,
  isChunkLoadError,
} from "@/lib/chunk-load-recovery";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
  segment?: string;
  homeHref?: string;
};

export function SegmentErrorFallback({
  error,
  reset,
  segment = "This section",
  homeHref = "/explore",
}: Props) {
  const chunkStale = isChunkLoadError(error);

  useEffect(() => {
    console.error(`[${segment}/error]`, error.message, error.digest ?? "");
    if (!chunkStale) return;

    try {
      if (sessionStorage.getItem("tipmanna_chunk_reload") === "1") return;
      sessionStorage.setItem("tipmanna_chunk_reload", "1");
    } catch {
      /* noop */
    }

    void hardReloadForLatestBuild();
  }, [chunkStale, error, segment]);

  if (chunkStale) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-8">
        <h1 className="text-lg font-semibold">Updating {segment}…</h1>
        <p className="max-w-md text-center text-sm text-neutral-600">
          A new version was deployed. Refreshing to load the latest build.
        </p>
        <button
          type="button"
          className="rounded-lg bg-black px-4 py-2 text-sm text-white"
          onClick={() => void hardReloadForLatestBuild()}
        >
          Refresh now
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-lg font-semibold">{segment} ran into a problem</h1>
      <p className="max-w-md text-center text-sm text-neutral-600">
        {error.message || "Something unexpected happened. You can try again."}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          className="rounded-lg bg-black px-4 py-2 text-sm text-white"
          onClick={() => reset()}
        >
          Try again
        </button>
        <Link
          href={homeHref}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
