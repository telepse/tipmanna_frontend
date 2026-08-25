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
import { cn } from "@/lib/utils";

export function HostNotificationsClient() {
  const [rows, setRows] = useState<InAppNotificationRow[]>([]);
  const [loading, setLoading] = useState(true);

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

  const markOne = async (id: string) => {
    const res = await markHostNotificationReadAction(id);
    if (!res.success) {
      toast.error(res.message ?? "Could not update");
      return;
    }
    await load();
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
            <li
              key={row.id}
              className={cn(
                "rounded-md border p-4",
                row.readAt ? "opacity-70" : "border-primary/30 bg-primary/5"
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{row.title}</p>
                  <p className="text-muted-foreground text-sm">{row.body}</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {new Date(row.createdAt).toLocaleString()}
                  </p>
                </div>
                {!row.readAt && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void markOne(row.id)}
                  >
                    Mark read
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-10">
        <HostNotificationPreferences />
      </div>
    </>
  );
}
