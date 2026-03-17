// components/dashboard/manage-event-card-skeleton.tsx
"use client";

export function ManageEventCardSkeleton() {
  return (
    <div className="bg-card flex animate-pulse flex-wrap items-center justify-between gap-4 rounded-md border p-6">
      <div className="flex-1 space-y-2">
        <div className="h-6 w-3/5 rounded bg-gray-300"></div> {/* Event name */}
        <div className="h-4 w-4/5 rounded bg-gray-200"></div>{" "}
        {/* Date & time */}
        <div className="h-4 w-2/3 rounded bg-gray-200"></div>{" "}
        {/* Tips & code */}
        <div className="h-4 w-1/2 rounded bg-gray-200"></div>{" "}
        {/* Tippers & rating */}
      </div>

      <div className="flex flex-col items-start gap-1 md:items-end">
        <div className="h-10 w-32 rounded bg-gray-300"></div>{" "}
        {/* View button */}
        <div className="h-10 w-32 rounded bg-gray-300"></div>{" "}
        {/* Share button */}
      </div>
    </div>
  );
}
