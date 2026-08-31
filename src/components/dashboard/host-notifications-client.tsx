"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";

import { DashboardHeading } from "@/components/dashboard/dashboard-heading";
import { Button } from "@/components/ui/button";
import {
  listHostNotificationsMeAction,
  markAllHostNotificationsReadAction,
  markHostNotificationReadAction,
  type InAppNotificationRow,
} from "@/actions/notifications";
import { HostNotificationPreferences } from "@/components/dashboard/host-notification-preferences";
import { NotificationDetailModal } from "@/components/notifications/notification-detail-modal";
import { cn } from "@/lib/utils";
import { useHostSession } from "@/hooks/use-host-session";
import { subscribeHostInAppNotifications } from "@/lib/host-notification-channel";

function deepLinkFromRow(row: InAppNotificationRow): string | null {
  if (row.deepLinkUrl) return row.deepLinkUrl;
  const payload = row.payloadJson as { deepLinkUrl?: string } | null;
  return payload?.deepLinkUrl ?? null;
}

export function HostNotificationsClient() {
  const { hostId } = useHostSession();
  const [rows, setRows] = useState<InAppNotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<InAppNotificationRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await listHostNotificationsMeAction({ limit: 80 });
    if (!res.success || !res.data) {
      toast.error(res.message ?? "Could not load notifications");
      setRows([]);
    } else {
      setRows(res.data.notifications ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!hostId) return;
    return subscribeHostInAppNotifications(hostId, () => {
      void load();
    });
  }, [hostId, load]);

  const openRow = async (row: InAppNotificationRow) => {
    if (!row.readAt) {
      await markHostNotificationReadAction(row.id);
      setRows(prev =>
        prev.map(r =>
          r.id === row.id ? { ...r, readAt: new Date().toISOString() } : r
        )
      );
    }
    setSelected(row);
  };

  const markAll = async () => {
    const res = await markAllHostNotificationsReadAction();
    if (!res.success) {
      toast.error(res.message ?? "Could not update");
      return;
    }
    toast.success("All marked read");
    await load();
  };

  const hasUnread = rows.some(r => !r.readAt);

  return (
    <>
      <DashboardHeading
        title="Notifications"
        subtitle="Community updates, bank decisions, and payouts."
      />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void load()}
          disabled={loading}
        >
          Refresh
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => void markAll()}
          disabled={loading || !hasUnread}
        >
          Mark all read
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground mt-6 text-sm">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground mt-6 text-sm">
          No notifications yet.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {rows.map(row => (
            <li key={row.id}>
              <button
                type="button"
                className={cn(
                  "hover:bg-muted/50 w-full rounded-md border p-4 text-left transition-colors",
                  row.readAt ? "opacity-70" : "border-primary/30 bg-primary/5"
                )}
                onClick={() => void openRow(row)}
              >
                <p className="font-medium">{row.title}</p>
                <p className="text-muted-foreground line-clamp-2 text-sm">
                  {row.body}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {new Date(row.createdAt).toLocaleString()}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}

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

      <div className="mt-10">
        <HostNotificationPreferences />
      </div>
    </>
  );
}
