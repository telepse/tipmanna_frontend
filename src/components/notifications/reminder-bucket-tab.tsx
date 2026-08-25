"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";

import { ReminderProgramCard } from "@/components/notifications/reminder-program-card";
import { Button } from "@/components/ui/button";
import {
  cancelReminderEntryAction,
  listMyReminderEntriesAction,
  listMyReminderHistoryAction,
  listReminderBucketPostsAction,
  setReminderBucketReminderAction,
} from "@/actions/reminder-bucket";
import { getAuthToken } from "@/lib/getAuthToken";
import { cn } from "@/lib/utils";
import type { RootState } from "@/redux/store";

type ReminderPost = {
  id: string;
  title: string;
  body?: string | null;
  scheduledAt: string;
  kind?: string;
  imageUrl?: string | null;
  landingUrl?: string | null;
  durationSec?: number | null;
  enforcementId?: string | null;
  globalEnforcementId?: string | null;
};

type ReminderEntry = {
  id: string;
  postId?: string | null;
  offsetMinutes?: number;
  scheduledAt?: string;
  reminderAt?: string;
  status?: string;
  title?: string;
};

type Props = {
  variant?: "drawer" | "page";
  /** When true, skip auto-load on mount (parent controls refresh). */
  deferLoad?: boolean;
};

const OFFSET_LABELS: Record<number, string> = {
  5: "5 min before",
  15: "15 min before",
  30: "30 min before",
  60: "1 hour before",
  1440: "1 day before",
};

function entryWhen(entry: ReminderEntry): string {
  return entry.scheduledAt ?? entry.reminderAt ?? new Date().toISOString();
}

export function ReminderBucketTab({
  variant = "drawer",
  deferLoad = false,
}: Props) {
  const [posts, setPosts] = useState<ReminderPost[]>([]);
  const [entries, setEntries] = useState<ReminderEntry[]>([]);
  const [history, setHistory] = useState<ReminderEntry[]>([]);
  const [offsets, setOffsets] = useState<number[]>([5, 15, 30, 60, 1440]);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<"available" | "mine" | "history">(
    "available"
  );
  const authUser = useSelector((s: RootState) => s.auth.user);
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const userId = authUser?.id;
  const loadedRef = useRef(false);

  const load = useCallback(
    async (opts?: { force?: boolean }) => {
      if (deferLoad && !opts?.force && loadedRef.current) return;
      setLoading(true);
      try {
        const postsRes = await listReminderBucketPostsAction();
        if (postsRes.success && postsRes.data) {
          setPosts(postsRes.data.posts ?? []);
          if (
            Array.isArray(postsRes.data.offsets) &&
            postsRes.data.offsets.length
          ) {
            setOffsets(postsRes.data.offsets);
          }
        } else {
          setPosts([]);
        }

        const token = getAuthToken();
        if (isAuthenticated && userId && authUser?.role !== "VISITOR") {
          const [entriesRes, historyRes] = await Promise.all([
            listMyReminderEntriesAction(token),
            listMyReminderHistoryAction(token),
          ]);
          setEntries(
            entriesRes.success && entriesRes.data
              ? (entriesRes.data.entries ?? [])
              : []
          );
          setHistory(
            historyRes.success && historyRes.data
              ? (historyRes.data.entries ?? [])
              : []
          );
        } else {
          setEntries([]);
          setHistory([]);
        }
        loadedRef.current = true;
      } catch {
        toast.error("Could not load reminders");
      } finally {
        setLoading(false);
      }
    },
    [deferLoad, isAuthenticated, userId, authUser?.role]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const setReminder = async (post: ReminderPost, offsetMinutes: number) => {
    if (!isAuthenticated || !userId || authUser?.role === "VISITOR") {
      toast.info("Sign in as a tipper to set a reminder");
      return;
    }
    const token = getAuthToken();
    const res = await setReminderBucketReminderAction(
      post.id,
      {
        offsetMinutes,
        scheduledAt: post.scheduledAt,
        title: post.title,
        body: post.body,
        enforcementId: post.enforcementId,
        globalEnforcementId: post.globalEnforcementId,
      },
      token
    );
    if (!res.success) {
      toast.error(res.error ?? res.message ?? "Could not set reminder");
      return;
    }
    toast.success("Reminder set");
    const entry = (res.data as { entry?: ReminderEntry })?.entry;
    if (entry?.id) {
      setEntries(prev => {
        const exists = prev.some(e => e.id === entry.id);
        return exists ? prev : [entry, ...prev];
      });
      setSection("mine");
    } else {
      void load({ force: true });
      setSection("mine");
    }
  };

  const cancelEntry = async (entryId: string) => {
    if (!isAuthenticated || !userId) return;
    const token = getAuthToken();
    const res = await cancelReminderEntryAction(entryId, token);
    if (!res.success) {
      toast.error(res.error ?? res.message ?? "Could not cancel reminder");
      return;
    }
    toast.success("Reminder cancelled");
    setEntries(prev => prev.filter(e => e.id !== entryId));
  };

  const sectionTabs = (
    <div className="mb-3 flex flex-wrap gap-2">
      {(["available", "mine", "history"] as const).map(s => (
        <Button
          key={s}
          type="button"
          size="sm"
          variant={section === s ? "default" : "outline"}
          onClick={() => setSection(s)}
        >
          {s === "available"
            ? "Available"
            : s === "mine"
              ? "My reminders"
              : "History"}
        </Button>
      ))}
    </div>
  );

  const entryList = (items: ReminderEntry[], cancellable: boolean) => (
    <ul className="space-y-2">
      {items.map(entry => (
        <li
          key={entry.id}
          className="flex items-start justify-between gap-2 rounded-lg border p-3"
        >
          <div>
            <p className="text-sm font-medium">
              {entry.title ?? "Program reminder"}
            </p>
            <p className="text-muted-foreground text-xs">
              {new Date(entryWhen(entry)).toLocaleString()}
              {!cancellable && entry.status ? ` · ${entry.status}` : ""}
            </p>
          </div>
          {cancellable ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void cancelEntry(entry.id)}
            >
              Cancel
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  );

  return (
    <div className={cn("pb-4", variant === "drawer" ? "px-2" : "px-0")}>
      {sectionTabs}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mb-3"
        onClick={() => void load({ force: true })}
        disabled={loading}
      >
        Refresh
      </Button>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : section === "mine" ? (
        !isAuthenticated ? (
          <p className="text-muted-foreground text-sm">
            Sign in to view your reminders.
          </p>
        ) : entries.length === 0 ? (
          <p className="text-muted-foreground text-sm">No active reminders.</p>
        ) : (
          entryList(entries, true)
        )
      ) : section === "history" ? (
        !isAuthenticated ? (
          <p className="text-muted-foreground text-sm">
            Sign in to view reminder history.
          </p>
        ) : history.length === 0 ? (
          <p className="text-muted-foreground text-sm">No reminder history.</p>
        ) : (
          entryList(history, false)
        )
      ) : posts.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No scheduled programs right now.
        </p>
      ) : (
        <ul className="space-y-3">
          {posts.map(post => (
            <ReminderProgramCard
              key={post.id}
              post={post}
              offsetLabels={OFFSET_LABELS}
              offsets={offsets}
              showReminderActions={isAuthenticated}
              onSetReminder={min => void setReminder(post, min)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
