// components/tv/content-card-skeleton.tsx
"use client";

export function ContentCardSkeleton() {
  return (
    <div className="flex min-w-[200px] animate-pulse flex-col gap-2 rounded-md border bg-black/5 p-2">
      {/* Video thumbnail */}
      <div className="aspect-video w-full rounded-md bg-gray-300"></div>

      {/* Title */}
      <div className="mt-1 h-4 w-3/4 rounded bg-gray-300"></div>

      {/* Stats */}
      <div className="flex gap-2 text-sm">
        <div className="h-3 w-12 rounded bg-gray-300"></div>
        <div className="h-3 w-16 rounded bg-gray-300"></div>
      </div>
    </div>
  );
}
