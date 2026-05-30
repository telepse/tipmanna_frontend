"use client";

// Third-party imports
import { Skeleton } from "@/components/ui/skeleton"; // if you have a Skeleton component
import { UserRound } from "lucide-react";

export const TopTipperCardSkeleton = () => {
  return (
    <div className="bg-card flex animate-pulse flex-wrap justify-between gap-2 rounded-md border p-4 sm:gap-4 sm:px-6 sm:py-8">
      <div className="flex items-center gap-4">
        {/* Position */}
        <Skeleton className="h-6 w-6 rounded-md sm:h-8 sm:w-8" />

        {/* Avatar */}
        <div className="rounded-full border bg-white p-2">
          <UserRound className="text-muted-foreground size-7 sm:size-10" />
        </div>

        {/* Name & badges */}
        <div className="space-y-2">
          <Skeleton className="h-5 w-32 sm:h-6 sm:w-40" />

          <div className="flex gap-2">
            <Skeleton className="h-5 w-16 rounded-md" />
            <Skeleton className="h-5 w-16 rounded-md" />
          </div>
        </div>
      </div>

      {/* Contribution & events supported */}
      <div className="flex gap-4">
        <div className="space-y-1">
          <Skeleton className="h-5 w-20 rounded-md" />
          <Skeleton className="h-3 w-24 rounded-md" />
        </div>

        <div className="space-y-1">
          <Skeleton className="h-5 w-10 rounded-md" />
          <Skeleton className="h-3 w-24 rounded-md" />
        </div>
      </div>
    </div>
  );
};
