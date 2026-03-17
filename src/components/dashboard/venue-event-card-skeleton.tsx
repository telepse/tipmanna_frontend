"use client";

export function VenueEventCardSkeleton() {
  return (
    <div className="bg-card flex animate-pulse flex-col gap-4 rounded-md border p-4 md:flex-row md:items-center md:justify-between md:p-6">
      {/* Screen Display Skeleton */}
      <div className="w-full space-y-4 md:flex md:items-center md:gap-4 md:space-y-0">
        <div className="w-full md:w-auto md:flex-shrink-0">
          <div className="h-[180px] w-full rounded-md bg-gray-300 sm:h-28 md:w-48" />
        </div>

        {/* Event details Skeleton */}
        <div className="w-full space-y-2 md:flex-1">
          <div className="h-4 w-3/5 rounded bg-gray-300" /> {/* Event name */}
          <div className="h-3 w-2/3 rounded bg-gray-200" /> {/* Date/time */}
          <div className="h-3 w-1/2 rounded bg-gray-200" />{" "}
          {/* Tips/performers */}
        </div>
      </div>

      {/* Settings button skeleton */}
      <div className="mt-4 h-10 w-full rounded bg-gray-300 md:mt-0 md:w-auto" />
    </div>
  );
}
