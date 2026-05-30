"use client";

import { useEffect, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { getTipsDrawerAction } from "@/actions/messages";
import { DRAWER_Z_INDEX } from "@/lib/drawer-z-index";

type TipRow = {
  id: string;
  characterName: string;
  purchasedAt: string;
  username: string;
  amount: number;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  channelId: string | null;
  eventRoomTipCount?: number;
  videoTipCount?: number;
};

export function TipsDrawer({
  open,
  onOpenChange,
  eventId,
  channelId,
  eventRoomTipCount,
  videoTipCount,
}: Props) {
  const [scope, setScope] = useState<"event" | "video">("event");
  const [items, setItems] = useState<TipRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !eventId?.trim()) {
      setItems([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void getTipsDrawerAction(eventId.trim(), channelId, scope).then(res => {
      if (cancelled) return;
      setLoading(false);
      if (res.success && res.data && typeof res.data === "object") {
        const data = res.data as { items?: TipRow[] };
        setItems(Array.isArray(data.items) ? data.items : []);
      } else {
        setItems([]);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, eventId, channelId, scope]);

  const headerTotal =
    scope === "video"
      ? (videoTipCount ?? items.length)
      : (eventRoomTipCount ?? items.length);

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
    >
      <DrawerContent
        data-testid="tips-drawer"
        className={`${DRAWER_Z_INDEX} flex h-[72vh] flex-col overflow-hidden rounded-t-[32px] bg-white p-0`}
      >
        <div className="border-b px-5 pt-5 pb-3">
          <div className="flex items-center justify-between">
            <DrawerHeader className="p-0">
              <DrawerTitle className="text-sm font-semibold">
                Tips · {headerTotal}
              </DrawerTitle>
            </DrawerHeader>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-full p-2 hover:bg-gray-100"
            >
              <X className="h-6 w-6 text-gray-600" />
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={scope === "event" ? "default" : "outline"}
              data-testid="tips-drawer-scope-event"
              data-scope-active={scope === "event" ? "true" : "false"}
              onClick={() => setScope("event")}
            >
              Event room tips
            </Button>
            {channelId ? (
              <Button
                type="button"
                size="sm"
                variant={scope === "video" ? "default" : "outline"}
                data-testid="tips-drawer-scope-video"
                data-scope-active={scope === "video" ? "true" : "false"}
                onClick={() => setScope("video")}
              >
                This video only
              </Button>
            ) : null}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <p className="text-muted-foreground text-center text-sm">
              Loading tips…
            </p>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground text-center text-sm">
              No tips yet for this {scope === "video" ? "video" : "event room"}.
            </p>
          ) : (
            <ul className="space-y-3">
              {items.map(row => (
                <li
                  key={row.id}
                  className="rounded-lg border px-3 py-2"
                >
                  <p className="text-sm font-semibold">{row.username}</p>
                  <p className="text-sm text-gray-700">{row.characterName}</p>
                  {typeof row.amount === "number" && row.amount > 0 ? (
                    <p className="text-primary mt-0.5 text-sm font-medium">
                      {row.amount.toLocaleString(undefined, {
                        style: "currency",
                        currency: "GBP",
                      })}
                    </p>
                  ) : null}
                  <p className="text-muted-foreground mt-1 text-xs">
                    {new Date(row.purchasedAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
