"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import { NotificationDetailModal } from "@/components/notifications/notification-detail-modal";
import {
  listNotificationsFeedAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
  deleteNotificationAction,
  type FeedNotificationRow,
} from "@/actions/notifications";
import { getDeviceKey } from "@/lib/getAuthToken";
import { cn } from "@/lib/utils";
import { useSelector } from "react-redux";
import type { RootState } from "@/redux/store";

type Props = {
  variant?: "drawer" | "page";
};

const FILTERS = [
  "all",
  "unread",
  "system",
  "reminders",
  "payments",
  "communities",
] as const;

type Filter = (typeof FILTERS)[number];

const PAGE_SIZE = 40;

function deepLinkFromRow(row: FeedNotificationRow): string | null {
  if (row.deepLinkUrl) return row.deepLinkUrl;
  if (row.landingUrl) return row.landingUrl;
  const payload = row.payloadJson as { deepLinkUrl?: string } | null;
  return payload?.deepLinkUrl ?? null;
}

function matchesFilter(row: FeedNotificationRow, filter: Filter): boolean {
  if (filter === "all") return true;
  if (filter === "unread") return !row.readAt;
  if (filter === "system")
    return row.categoryKey === "system" || row.source === "public_broadcast";
  if (filter === "reminders")
    return (
      row.categoryKey === "tv_reminder" ||
      row.source === "reminder_post" ||
      row.kind.includes("reminder")
    );
  if (filter === "payments")
    return (
      row.categoryKey === "wallet" ||
      row.categoryKey === "tip_payment" ||
      row.categoryKey === "payout"
    );
  if (filter === "communities") return row.categoryKey === "community";
  return true;
}

export function NotificationsTab({ variant = "drawer" }: Props) {
  const [rows, setRows] = useState<FeedNotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<FeedNotificationRow | null>(null);
  const authUser = useSelector((s: RootState) => s.auth.user);

  const load = useCallback(
    async (opts?: { append?: boolean; cursor?: string | null }) => {
      if (opts?.append) setLoadingMore(true);
      else setLoading(true);

      const deviceKey = getDeviceKey();
      const res = await listNotificationsFeedAction({
        deviceKey,
        limit: PAGE_SIZE,
        cursor: opts?.cursor ?? undefined,
      });

      if (!res.success || !res.data) {
        toast.error(res.message ?? "Could not load notifications");
        if (!opts?.append) setRows([]);
      } else {
        const incoming = res.data.notifications ?? [];
        setRows(prev => (opts?.append ? [...prev, ...incoming] : incoming));
        setNextCursor(res.data.nextCursor ?? null);
      }

      setLoading(false);
      setLoadingMore(false);
    },
    []
  );

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () => rows.filter(r => matchesFilter(r, filter)),
    [rows, filter]
  );

  const openRow = async (row: FeedNotificationRow) => {
    if (authUser && row.source === "personal" && !row.readAt) {
      const res = await markNotificationReadAction(row.id);
      if (res.success) {
        setRows(prev =>
          prev.map(r =>
            r.id === row.id ? { ...r, readAt: new Date().toISOString() } : r
          )
        );
      }
    }
    setSelected(row);
  };

  const markAll = async () => {
    if (!authUser) {
      toast.info("Sign in to mark personal notifications as read");
      return;
    }
    const res = await markAllNotificationsReadAction();
    if (!res.success) {
      toast.error(res.message ?? "Could not update");
      return;
    }
    await load();
  };

  const removeOne = async (row: FeedNotificationRow) => {
    if (!authUser || row.source !== "personal") return;
    const res = await deleteNotificationAction(row.id);
    if (!res.success) {
      toast.error(res.message ?? "Could not delete");
      return;
    }
    setSelected(null);
    await load();
  };

  const hasUnreadPersonal = rows.some(
    r => r.source === "personal" && !r.readAt
  );

  return (
    <div className={cn("pb-4", variant === "drawer" ? "px-2" : "px-0")}>
      {variant === "page" ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {FILTERS.map(f => (
            <Button
              key={f}
              type="button"
              size="sm"
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>
      ) : null}

      <div className="mb-3 flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void load()}
          disabled={loading}
        >
          Refresh
        </Button>
        {authUser ? (
          <Button
            type="button"
            size="sm"
            onClick={() => void markAll()}
            disabled={loading || !hasUnreadPersonal}
          >
            Mark all read
          </Button>
        ) : (
          <Button
            asChild
            size="sm"
            variant="outline"
          >
            <Link href="/sign-in">Sign in for personal alerts</Link>
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm">No notifications yet.</p>
      ) : (
        <>
          <ul className="space-y-2">
            {filtered.map(row => (
              <li key={row.id}>
                <div
                  className={cn(
                    "hover:bg-muted/40 w-full rounded-lg border p-3 text-left transition",
                    !row.readAt &&
                      row.source === "personal" &&
                      "border-primary/40 bg-primary/5"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => void openRow(row)}
                    className="w-full text-left"
                  >
                    <p className="text-sm font-medium">{row.title}</p>
                    <p className="text-muted-foreground mt-1 text-xs whitespace-pre-wrap">
                      {row.body}
                    </p>
                    <p className="text-muted-foreground mt-2 text-[11px]">
                      {new Date(row.createdAt).toLocaleString()}
                      {row.source !== "personal" ? " · Public" : ""}
                      {!row.readAt && row.source === "personal"
                        ? " · Unread"
                        : ""}
                    </p>
                  </button>
                  {variant === "page" &&
                  authUser &&
                  row.source === "personal" ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-2"
                      onClick={() => void removeOne(row)}
                    >
                      Delete
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          {nextCursor ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              disabled={loadingMore}
              onClick={() => void load({ append: true, cursor: nextCursor })}
            >
              {loadingMore ? "Loading…" : "Load more"}
            </Button>
          ) : null}
        </>
      )}

      <NotificationDetailModal
        row={selected}
        open={Boolean(selected)}
        onOpenChange={open => {
          if (!open) setSelected(null);
        }}
        deepLink={selected ? deepLinkFromRow(selected) : null}
      />
    </div>
  );
}
