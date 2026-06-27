"use client";

import { cn } from "@/lib/utils";

function Pulse({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-white/10", className)}
      aria-hidden
    />
  );
}

export function ExploreFeedSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative flex h-[100dvh] w-full flex-col overflow-hidden bg-black",
        className
      )}
      aria-busy="true"
      aria-label="Loading explore feed"
    >
      <div className="relative flex min-h-0 flex-1 flex-col">
        <Pulse className="mx-auto aspect-[9/16] h-full max-h-[72dvh] w-full max-w-[min(100%,420px)] sm:aspect-video sm:max-h-none sm:max-w-none" />
        <div className="pointer-events-none absolute right-3 bottom-28 flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Pulse
              key={i}
              className="size-10 rounded-full"
            />
          ))}
        </div>
        <div className="absolute right-4 bottom-36 left-4 space-y-2 sm:bottom-32">
          <Pulse className="h-4 w-40" />
          <Pulse className="h-3 w-28" />
        </div>
        <div className="absolute inset-x-0 bottom-0 border-t border-white/10 bg-black/80 px-4 py-3">
          <Pulse className="mb-3 h-1 w-full rounded-full" />
          <div className="flex items-center justify-between gap-3">
            <Pulse className="size-10 rounded-full" />
            <Pulse className="h-10 flex-1 rounded-full" />
            <Pulse className="size-10 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
