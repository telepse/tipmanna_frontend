"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEventRoomRealtime } from "@/hooks/use-event-room-realtime";
import { useTipsDrawerData } from "@/hooks/use-tips-drawer-data";
import { cn, formatCurrency } from "@/lib/utils";

export type TipFeedRow = {
  id: string;
  characterName: string;
  purchasedAt: string;
  username: string;
  amount: number;
};

type Props = {
  eventId: string;
  channelId: string | null;
  eventRoomTipCount?: number;
  videoTipCount?: number;
  /** When false, skips fetch and clears rows (e.g. drawer closed). */
  enabled?: boolean;
  className?: string;
  variant?: "standalone" | "drawer";
  showTipCount?: boolean;
  onClose?: () => void;
};

export function formatPurchasedAt(dateString: string): string {
  const date = new Date(dateString);

  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = date.toLocaleString("en-GB", {
    month: "long",
    timeZone: "UTC",
  });
  const year = date.getUTCFullYear();
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");

  return `${day} ${month}, ${year} ${hours}:${minutes}`;
}

export function TipsFeedPanel({
  eventId,
  channelId,
  eventRoomTipCount,
  videoTipCount,
  enabled = true,
  className,
  variant = "standalone",
  showTipCount = true,
  onClose,
}: Props) {
  const [scope, setScope] = useState<"event" | "video">("event");

  const trimmedEventId = eventId?.trim() ?? "";
  const { items, loading, loadingMore, hasMore, loadMore } = useTipsDrawerData(
    trimmedEventId,
    channelId,
    scope,
    enabled && Boolean(trimmedEventId)
  );
  const loadMoreRef = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el || !hasMore || loading || loadingMore) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "120px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadMore, loading, loadingMore]);
  const { numOfTips: liveNumOfTips } = useEventRoomRealtime({
    eventId: trimmedEventId,
    initialAmountRaised: 0,
    initialNumOfTips: eventRoomTipCount ?? 0,
    enabled: enabled && Boolean(trimmedEventId),
  });

  const resolvedEventRoomCount = eventRoomTipCount ?? liveNumOfTips;
  const resolvedVideoCount = videoTipCount ?? liveNumOfTips;

  const headerTotal =
    scope === "video"
      ? (resolvedVideoCount ?? items.length)
      : (resolvedEventRoomCount ?? items.length);

  const scopeToggle = (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        size="sm"
        // variant={scope === "event" ? "default" : "outline"}
        data-testid="tips-drawer-scope-event"
        // data-scope-active={scope === "event" ? "true" : "false"}
        onClick={() => setScope("event")}
        className={cn(
          "border-none bg-transparent px-2 text-black",
          scope === "event" ? "underline" : ""
        )}
      >
        Channel tips
      </Button>
      {channelId ? (
        <Button
          type="button"
          size="sm"
          // variant={scope === "video" ? "default" : "outline"}
          data-testid="tips-drawer-scope-video"
          // data-scope-active={scope === "video" ? "true" : "false"}
          onClick={() => setScope("video")}
          className={cn(
            "border-none bg-transparent px-2 text-black",
            scope === "video" ? "underline" : ""
          )}
        >
          This video only
        </Button>
      ) : null}
    </div>
  );

  const listBody =
    loading && items.length === 0 ? (
      <ul
        className="space-y-2"
        aria-busy="true"
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <li
            key={i}
            className="animate-pulse rounded-lg border bg-gray-50 px-2 py-4"
          />
        ))}
      </ul>
    ) : items.length === 0 ? (
      <p className="text-muted-foreground text-center text-sm">
        No tips yet for this {scope === "video" ? "video" : "event room"}.
      </p>
    ) : (
      <ul className="space-y-1">
        {items.map(row => (
          <li
            key={row.id}
            className="rounded-lg border px-2 py-0.5"
          >
            <div className="flex items-center gap-2">
              <p className="text-xs">
                {row.amount && (
                  <div className="bg-secondary inline-block rounded-full px-1.5 py-0.5 text-xs font-semibold">
                    {formatCurrency(row.amount)}
                  </div>
                )}{" "}
                <span className="font-semibold">{row.username}</span> just sent{" "}
                {row.characterName}
              </p>
            </div>

            <p className="text-muted-foreground text-right text-[10px]">
              {formatPurchasedAt(row.purchasedAt)}
            </p>
          </li>
        ))}
        {hasMore ? (
          <li
            ref={loadMoreRef}
            className="py-3 text-center text-xs text-gray-500"
          >
            {loadingMore ? "Loading more tips…" : "Scroll for more"}
          </li>
        ) : null}
      </ul>
    );

  if (variant === "drawer") {
    return (
      <>
        <div className="border-b px-5 pt-5 pb-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              Tips · {showTipCount ? headerTotal : ""}
            </h2>
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 hover:bg-gray-100"
              >
                <X className="h-6 w-6 text-gray-600" />
              </button>
            ) : null}
          </div>
          <div className="mt-3">{scopeToggle}</div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
          {listBody}
        </div>
      </>
    );
  }

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      {showTipCount && (
        <div className="mb-3">
          <h2 className="text-sm font-semibold">Tips · {headerTotal}</h2>
        </div>
      )}
      {scopeToggle}
      <div className="min-h-0 flex-1 overflow-y-auto">{listBody}</div>
    </div>
  );
}
