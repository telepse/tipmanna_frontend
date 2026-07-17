"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

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

export default function TvHomePreviewSectionLazy() {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={sentinelRef}>
      {inView ? <TvHomePreviewSection /> : <TvHomePreviewSkeleton />}
    </div>
  );
}
