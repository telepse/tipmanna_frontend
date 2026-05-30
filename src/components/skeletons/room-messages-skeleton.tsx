export function RoomMessagesSkeleton() {
  return (
    <div
      className="flex-1 overflow-hidden px-4 py-2"
      aria-hidden
    >
      <div className="mini-wrapper section flex flex-col gap-3 p-2 sm:p-4">
        <div className="flex h-10 items-center justify-between gap-4 rounded-t-2xl bg-neutral-100 p-4">
          <div className="h-6 w-24 animate-pulse rounded bg-neutral-200" />
          <div className="h-6 w-16 animate-pulse rounded bg-neutral-200" />
        </div>
        <div className="mt-2 flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex gap-2"
            >
              <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-neutral-200" />
              <div className="flex flex-1 flex-col gap-2">
                <div
                  className="h-3 animate-pulse rounded bg-neutral-200"
                  style={{ width: `${40 + (i % 4) * 12}%` }}
                />
                <div className="h-3 w-[72%] max-w-[200px] animate-pulse rounded bg-neutral-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
