"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTipsDrawerAction } from "@/actions/messages";
import { useEventRoomRealtime } from "@/hooks/use-event-room-realtime";
import { cn, formatCurrency, formatUtcTime } from "@/lib/utils";

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
  const [items, setItems] = useState<TipFeedRow[]>([]);
  const [loading, setLoading] = useState(false);

  const trimmedEventId = eventId?.trim() ?? "";
  const { numOfTips: liveNumOfTips } = useEventRoomRealtime({
    eventId: trimmedEventId,
    initialAmountRaised: 0,
    initialNumOfTips: eventRoomTipCount ?? 0,
    enabled: enabled && Boolean(trimmedEventId),
  });

  const resolvedEventRoomCount = eventRoomTipCount ?? liveNumOfTips;
  const resolvedVideoCount = videoTipCount ?? liveNumOfTips;

  useEffect(() => {
    if (!enabled || !trimmedEventId) {
      setItems([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void getTipsDrawerAction(trimmedEventId, channelId, scope).then(res => {
      if (cancelled) return;
      setLoading(false);
      if (res.success && res.data && typeof res.data === "object") {
        const data = res.data as { items?: TipFeedRow[] };
        setItems(Array.isArray(data.items) ? data.items : []);
      } else {
        setItems([]);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, trimmedEventId, channelId, scope]);

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

  const listBody = loading ? (
    <p className="text-muted-foreground text-center text-sm">Loading tips…</p>
  ) : items.length === 0 ? (
    <p className="text-muted-foreground text-center text-sm">
      No tips yet for this {scope === "video" ? "video" : "event room"}.
    </p>
  ) : (
    <ul className="space-y-1 overflow-y-auto">
      {items.map(row => (
        <li
          key={row.id}
          className="rounded-lg border p-2"
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
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
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
      <div className="mt-3 min-h-0 flex-1 overflow-y-auto">{listBody}</div>
    </div>
  );
}
