export const EventRoomSkeleton = () => {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-50">
      {/* Header Skeleton */}
      <div className="border-b bg-white px-4 py-4">
        <div className="mx-auto max-w-6xl space-y-2">
          {/* Event preview + Progress bar + User button */}
          <div className="flex items-center justify-between gap-4">
            <div className="h-12 flex-1 animate-pulse rounded bg-gray-200"></div>

            <div className="h-6 flex-2 animate-pulse rounded bg-gray-200"></div>

            <div className="h-12 flex-1 animate-pulse rounded bg-gray-200"></div>
          </div>

          <div className="space-y-2">
            <div className="h-6 w-40 animate-pulse rounded bg-gray-200"></div>

            <div className="flex items-center justify-between">
              <div className="h-6 w-20 animate-pulse rounded bg-gray-200"></div>

              <div className="space-y-1">
                <div className="h-3 w-20 animate-pulse rounded bg-gray-200"></div>
                <div className="h-3 w-20 animate-pulse rounded bg-gray-200"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Banner Skeleton */}
      <div className="h-48 w-full animate-pulse bg-gray-200"></div>

      {/* Main Content Skeleton */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col">
          {/* Video Player Skeleton */}
          <div className="border-b p-4">
            <div className="mx-auto aspect-video max-w-4xl animate-pulse rounded-lg bg-gray-200"></div>
          </div>

          {/* Messages Area Skeleton */}
          <div className="flex-1 space-y-4 p-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="flex space-x-3"
              >
                <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/4 animate-pulse rounded bg-gray-200"></div>
                  <div className="h-3 w-3/4 animate-pulse rounded bg-gray-200"></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Skeleton */}
        <div className="w-80 space-y-4 border-l bg-white p-4">
          <div className="h-8 animate-pulse rounded bg-gray-200"></div>
          <div className="h-32 animate-pulse rounded bg-gray-200"></div>
          <div className="h-24 animate-pulse rounded bg-gray-200"></div>
        </div>
      </div>

      {/* Footer Skeleton */}
      <div className="border-t bg-white px-4 py-3">
        <div className="mx-auto h-12 max-w-2xl animate-pulse rounded bg-gray-200"></div>
      </div>
    </div>
  );
};
