"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Loader2, X } from "lucide-react";

import {
  listHostNotificationsMeAction,
  markAllHostNotificationsReadAction,
  markHostNotificationReadAction,
  type InAppNotificationRow,
} from "@/actions/notifications";
import { NotificationDetailModal } from "@/components/notifications/notification-detail-modal";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DRAWER_Z_INDEX } from "@/lib/drawer-z-index";

function deepLinkFromRow(row: InAppNotificationRow): string | null {
  if (row.deepLinkUrl) return row.deepLinkUrl;
  const payload = row.payloadJson as { deepLinkUrl?: string } | null;
  return payload?.deepLinkUrl ?? null;
}

type Props = {
  communityId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUnreadChanged?: () => void;
};

export function HostCommunityNotificationsDrawer({
  communityId,
  open,
  onOpenChange,
  onUnreadChanged,
}: Props) {
  const [rows, setRows] = useState<InAppNotificationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<InAppNotificationRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await listHostNotificationsMeAction({
      limit: 80,
      communityId,
    });
    if (!res.success || !res.data) {
      toast.error(res.message ?? "Could not load notifications");
      setRows([]);
    } else {
      setRows(res.data.notifications ?? []);
    }
    setLoading(false);
  }, [communityId]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [load, open]);

  const openRow = async (row: InAppNotificationRow) => {
    if (!row.readAt) {
      await markHostNotificationReadAction(row.id);
      setRows(prev =>
        prev.map(r =>
          r.id === row.id ? { ...r, readAt: new Date().toISOString() } : r
        )
      );
      onUnreadChanged?.();
    }
    setSelected(row);
  };

  const markAll = async () => {
    const res = await markAllHostNotificationsReadAction({ communityId });
    if (!res.success) {
      toast.error(res.message ?? "Could not update");
      return;
    }
    toast.success("All marked read");
    onUnreadChanged?.();
    await load();
  };

  const hasUnread = rows.some(r => !r.readAt);

  return (
    <>
      <Drawer
        open={open}
        onOpenChange={onOpenChange}
      >
        <DrawerContent
          className="max-h-[85vh]"
          style={{ zIndex: DRAWER_Z_INDEX }}
        >
          <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
            <DrawerTitle className="text-base font-semibold">
              Community notifications
            </DrawerTitle>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground rounded-md p-1"
              aria-label="Close"
              onClick={() => onOpenChange(false)}
            >
              <X className="size-5" />
            </button>
          </div>
          <div className="flex flex-col gap-3 overflow-y-auto px-4 pb-6">
            {hasUnread ? (
              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void markAll()}
                >
                  Mark all read
                </Button>
              </div>
            ) : null}
            {loading ? (
              <div className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
                <Loader2
                  className="size-4 animate-spin"
                  aria-hidden
                />
                Loading…
              </div>
            ) : rows.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center text-sm">
                No notifications for this community yet.
              </p>
            ) : (
              <ul className="divide-border divide-y rounded-md border">
                {rows.map(row => (
                  <li key={row.id}>
                    <button
                      type="button"
                      className={cn(
                        "hover:bg-muted/50 w-full px-3 py-3 text-left transition-colors",
                        !row.readAt && "bg-muted/30"
                      )}
                      onClick={() => void openRow(row)}
                    >
                      <p className="text-sm font-medium">{row.title}</p>
                      {row.body ? (
                        <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                          {row.body}
                        </p>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DrawerContent>
      </Drawer>
      <NotificationDetailModal
        open={Boolean(selected)}
        onOpenChange={open => {
          if (!open) setSelected(null);
        }}
        row={
          selected
            ? {
                ...selected,
                source: "personal" as const,
              }
            : null
        }
        deepLink={selected ? deepLinkFromRow(selected) : null}
      />
    </>
  );
}
