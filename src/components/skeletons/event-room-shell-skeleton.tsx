import { RoomMessagesSkeleton } from "./room-messages-skeleton";

export function EventRoomShellSkeleton() {
  return (
    <section
      className="relative flex h-[100svh] flex-col overflow-hidden"
      aria-busy="true"
      aria-label="Loading event room"
    >
      <div className="mini-wrapper h-[104px] w-full flex-shrink-0 border-b px-4 py-1 sm:h-32">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="h-5 w-40 animate-pulse rounded bg-neutral-200 sm:h-6 sm:w-56" />
            <div className="h-4 w-20 animate-pulse rounded bg-neutral-100" />
          </div>
          <div className="h-2 w-full animate-pulse rounded-full bg-neutral-100" />
          <div className="h-16 w-full animate-pulse rounded-lg bg-neutral-100 sm:h-20" />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <RoomMessagesSkeleton />
      </div>

      <div className="h-14 w-full shrink-0 animate-pulse border-t bg-neutral-50" />
    </section>
  );
}
