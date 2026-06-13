"use client";

import { cn } from "@/lib/utils";

function PulseBlock({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-md bg-gray-300", className)} />
  );
}

export function TvLooperSkeleton({ layout }: { layout: "wide" | "compact" }) {
  const isWide = layout === "wide";

  return (
    <div
      className={cn(
        "flex w-full animate-pulse flex-col overflow-hidden rounded-2xl border border-gray-200 bg-black/5",
        isWide ? "aspect-video min-h-[320px]" : "min-h-[220px] flex-1"
      )}
      aria-busy="true"
      aria-label="Loading TV player"
    >
      <div className="relative flex flex-1 items-center justify-center bg-gray-200">
        <div className="size-14 rounded-full bg-gray-300" />
      </div>
      {!isWide ? (
        <div className="space-y-2 border-t border-gray-200 bg-white/80 p-3">
          <PulseBlock className="h-4 w-2/3" />
          <PulseBlock className="h-3 w-1/2" />
        </div>
      ) : null}
    </div>
  );
}

export function TvRightPanelSkeleton({
  layout,
}: {
  layout: "desktop" | "mobile";
}) {
  const rowCount = layout === "desktop" ? 6 : 4;

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-3",
        layout === "desktop" && "rounded-2xl border border-gray-300 p-4"
      )}
      aria-busy="true"
      aria-label="Loading TV playlist"
    >
      <div className="flex items-center justify-between gap-2 border-b border-gray-200 pb-2">
        <div className="flex gap-2">
          <PulseBlock className="h-6 w-16" />
          <PulseBlock className="h-6 w-16" />
        </div>
        <PulseBlock className="h-6 w-14" />
      </div>

      <div className="flex gap-2 overflow-hidden">
        <PulseBlock className="h-7 w-24 shrink-0" />
        <PulseBlock className="h-7 w-20 shrink-0" />
        <PulseBlock className="h-7 w-20 shrink-0" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: rowCount }).map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-3"
          >
            <PulseBlock className="size-12 shrink-0 rounded-lg" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <PulseBlock className="h-3 w-full max-w-[220px]" />
              <PulseBlock className="h-3 w-24" />
            </div>
            <PulseBlock className="h-3 w-10 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TvTipSectionSkeleton() {
  return (
    <div
      className="flex w-full flex-col gap-3 px-2 py-1"
      aria-busy="true"
      aria-label="Loading tip section"
    >
      <div className="flex items-center justify-between gap-2">
        <PulseBlock className="h-5 w-20" />
        <PulseBlock className="h-9 w-24 rounded-full" />
      </div>
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="flex shrink-0 flex-col items-center gap-1"
          >
            <PulseBlock className="size-12 rounded-full" />
            <PulseBlock className="h-3 w-10" />
          </div>
        ))}
      </div>
    </div>
  );
}
