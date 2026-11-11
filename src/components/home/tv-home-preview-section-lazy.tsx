"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";

function TvHomePreviewSkeleton() {
  return (
    <section
      className="border-border/60 bg-background w-full border-t py-10 md:py-14"
      aria-busy="true"
      aria-label="Loading Tipmanna TV preview"
    >
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="mb-4 space-y-2">
          <div className="bg-muted/60 h-7 w-40 animate-pulse rounded md:h-8" />
          <div className="bg-muted/50 h-4 max-w-xl animate-pulse rounded" />
        </div>
        <div className="bg-muted/50 flex min-h-[200px] w-full items-center justify-center rounded-lg md:min-h-[280px]">
          <span className="text-muted-foreground text-sm">
            Loading live TV…
          </span>
        </div>
      </div>
    </section>
  );
}

const TvHomePreviewSection = dynamic(
  () => import("./tv-home-preview-section"),
  {
    ssr: false,
    loading: () => <TvHomePreviewSkeleton />,
  }
);

/**
 * Partner-only lazy mount: next/dynamic keeps tv-home-preview-section in its own
 * chunk; mount immediately so S7 can observe the lazy chunk without IO flakiness.
 * Scroll sentinel remains for runner prepare (scrollPartnerTvPreviewSentinelIntoView).
 */
export default function TvHomePreviewSectionLazy() {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || typeof el.scrollIntoView !== "function") return;
    el.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, []);

  return (
    <div
      ref={sentinelRef}
      data-partner-tv-preview-sentinel="1"
    >
      <TvHomePreviewSection />
    </div>
  );
}
