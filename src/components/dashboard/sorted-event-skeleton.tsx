"use client";

export const SortedEventSkeleton = () => {
  return (
    <div className="bg-card flex animate-pulse cursor-pointer items-center justify-between rounded-md border p-4">
      {/* Left side */}
      <div className="space-y-1">
        <div className="h-4 w-48 rounded bg-gray-200" /> {/* Event name */}
        <div className="mt-1 h-3 w-32 rounded bg-gray-200" />{" "}
        {/* Date & time */}
      </div>

      {/* Right side status pill */}
      <div className="h-5 w-16 rounded bg-gray-200" />
    </div>
  );
};
