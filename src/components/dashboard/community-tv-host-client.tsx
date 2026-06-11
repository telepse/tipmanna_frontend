"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, Loader2, Tv } from "lucide-react";

import { CommunityTvAdjustmentHostTab } from "@/components/dashboard/community-tv-adjustment-host-tab";
import { CommunityTvEnforcementHostTab } from "@/components/dashboard/community-tv-enforcement-host-tab";
import { CommunityTvProgramReportHostTab } from "@/components/dashboard/community-tv-program-report-host-tab";
import { HostReminderBucketTab } from "@/components/dashboard/host-reminder-bucket-tab";
import { DashboardHeading } from "@/components/dashboard/dashboard-heading";
import { fetchTvScheduleAction } from "@/actions/tv-schedule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { RootState } from "@/redux/store";

type ScheduleRow = {
  id: string;
  duration?: number;
  channel?: { title?: string; id?: string };
  blockTitle?: string;
};

export function CommunityTvHostClient({ hostSlug }: { hostSlug: string }) {
  const authToken = useSelector((s: RootState) => s.auth.token);
  const searchParams = useSearchParams();
  const communityId = searchParams.get("communityId")?.trim() ?? "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const [revision, setRevision] = useState<number>(0);
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [channelSearch, setChannelSearch] = useState("");
  const [channelHits, setChannelHits] = useState<
    {
      id: string;
      title: string;
      eventName?: string;
      playbackStatus?: string;
      liveStatus?: string;
      faultReason?: string | null;
      tvPlayable?: boolean;
      globallyBanned?: boolean;
    }[]
  >([]);
  const [channelSearchLoading, setChannelSearchLoading] = useState(false);
  const [communityExclusions, setCommunityExclusions] = useState<
    {
      id: string;
      eventChannelId: string;
      eventChannel: {
        id: string;
        title: string;
        playbackStatus?: string;
        liveStatus?: string;
        faultReason?: string | null;
      };
    }[]
  >([]);
  const [globalBans, setGlobalBans] = useState<
    {
      id: string;
      eventChannelId: string;
      eventChannel: { id: string; title: string; faultReason?: string | null };
    }[]
  >([]);
  const [upcomingItems, setUpcomingItems] = useState<ScheduleRow[]>([]);
  const [ongoingBatchTitle, setOngoingBatchTitle] = useState("Ongoing batch");
  const [upcomingBatchTitle, setUpcomingBatchTitle] =
    useState("Upcoming batch");
  const [upcomingRevision, setUpcomingRevision] = useState<number | null>(null);

  const base = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "";

  const load = useCallback(async () => {
    if (!communityId) {
      setLoading(false);
      setError("Missing communityId in URL.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const schedRes = await fetchTvScheduleAction({ communityId });
      if (!schedRes.success || !schedRes.data?.body) {
        setError(
          schedRes.error ?? schedRes.message ?? "Could not load schedule."
        );
        setOrderedIds([]);
        setUpcomingItems([]);
        return;
      }
      const data = schedRes.data.body as Record<string, unknown>;
      const items = (
        Array.isArray(data.items) ? data.items : []
      ) as ScheduleRow[];
      const idList = items.map((r: ScheduleRow) => r.id).filter(Boolean);
      const lab: Record<string, string> = {};
      for (const r of items) {
        if (r.id)
          lab[r.id] =
            r.blockTitle ||
            r.channel?.title ||
            `Clip ${r.channel?.id?.slice(0, 8) ?? r.id.slice(0, 8)}`;
      }
      setOrderedIds(idList);
      setLabels(lab);
      setScheduleId(
        typeof data.activeScheduleId === "string" ? data.activeScheduleId : null
      );
      const revisions = (data.scheduleRevisions ?? {}) as {
        ongoing?: number;
        upcoming?: number;
      };
      const rev = revisions?.ongoing;
      setRevision(typeof rev === "number" ? rev : 0);

      const alt = (
        Array.isArray(data.alternateBatchItems) ? data.alternateBatchItems : []
      ) as ScheduleRow[];
      setUpcomingItems(alt);
      if (typeof data.ongoingLabel === "string" && data.ongoingLabel) {
        setOngoingBatchTitle(data.ongoingLabel);
      }
      if (typeof data.upcomingLabel === "string" && data.upcomingLabel) {
        setUpcomingBatchTitle(data.upcomingLabel);
      }
      const upRev = revisions?.upcoming;
      setUpcomingRevision(typeof upRev === "number" ? upRev : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [base, communityId]);

  const loadBlocks = useCallback(async () => {
    if (!communityId || !authToken) return;
    try {
      const [exRes, gbRes] = await Promise.all([
        fetch(
          `${base}/communities/${encodeURIComponent(communityId)}/tv/content-blocks`,
          { headers: { Authorization: `Bearer ${authToken}` } }
        ),
        fetch(
          `${base}/communities/${encodeURIComponent(communityId)}/tv/global-bans`,
          { headers: { Authorization: `Bearer ${authToken}` } }
        ),
      ]);
      const exData = (await exRes.json()) as {
        items?: typeof communityExclusions;
      };
      const gbData = (await gbRes.json()) as { items?: typeof globalBans };
      setCommunityExclusions(Array.isArray(exData.items) ? exData.items : []);
      setGlobalBans(Array.isArray(gbData.items) ? gbData.items : []);
    } catch {
      setCommunityExclusions([]);
      setGlobalBans([]);
    }
  }, [authToken, base, communityId]);

  useEffect(() => {
    void load();
    void loadBlocks();
  }, [load, loadBlocks]);

  const searchChannels = useCallback(async () => {
    const q = channelSearch.trim();
    if (!communityId || q.length < 2) {
      setChannelHits([]);
      return;
    }
    const token = authToken;
    if (!token) {
      setError("Sign in as the community owner to search.");
      return;
    }
    setChannelSearchLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${base}/communities/${encodeURIComponent(communityId)}/tv/channels/search?q=${encodeURIComponent(q)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = (await res.json()) as {
        items?: {
          id: string;
          title: string;
          eventName?: string;
          playbackStatus?: string;
          liveStatus?: string;
          faultReason?: string | null;
          tvPlayable?: boolean;
          globallyBanned?: boolean;
        }[];
      };
      setChannelHits(Array.isArray(data.items) ? data.items : []);
    } catch {
      setChannelHits([]);
    } finally {
      setChannelSearchLoading(false);
    }
  }, [base, channelSearch, communityId]);

  const move = useCallback((idx: number, dir: -1 | 1) => {
    setOrderedIds(prev => {
      const j = idx + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[j]] = [next[j]!, next[idx]!];
      return next;
    });
  }, []);

  const save = useCallback(async () => {
    if (!communityId || !scheduleId) return;
    const token = authToken;
    if (!token) {
      setError("Sign in as the community owner to save order.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `${base}/communities/${encodeURIComponent(communityId)}/tv/daily-schedule/${encodeURIComponent(scheduleId)}/reorder`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            orderedItemIds: orderedIds,
            expectedRevision: revision,
          }),
        }
      );
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `Save failed (${res.status})`);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [base, communityId, load, orderedIds, revision, scheduleId]);

  const deactivateTv = useCallback(async () => {
    if (!communityId) return;
    if (
      !window.confirm(
        "Turn off community TV for viewers? An admin can turn it back on."
      )
    )
      return;
    const token = authToken;
    if (!token) return;
    try {
      const res = await fetch(
        `${base}/communities/${encodeURIComponent(communityId)}/tv/deactivate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!res.ok) throw new Error(`Deactivate failed (${res.status})`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Deactivate failed");
    }
  }, [base, communityId, load]);

  const backHref = useMemo(
    () => `/host/${hostSlug}/host-community`,
    [hostSlug]
  );

  if (!communityId) {
    return (
      <>
        <DashboardHeading
          title="Community TV schedule"
          subtitle="Open from Community management with a community selected."
        />
        <Button
          asChild
          variant="outline"
        >
          <Link href={backHref}>Back to community</Link>
        </Button>
      </>
    );
  }

  return (
    <>
      <DashboardHeading
        title="Community TV"
        subtitle="Manage playlist order and themed scheduling for your community channel."
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          asChild
          variant="outline"
          size="sm"
        >
          <Link href={backHref}>Back</Link>
        </Button>
        <Button
          asChild
          variant="secondary"
          size="sm"
        >
          <Link
            href={`/tv?community=${encodeURIComponent(communityId)}`}
            className="inline-flex items-center gap-1"
          >
            <Tv className="size-4" />
            Watch community TV
          </Link>
        </Button>
      </div>

      <Tabs
        defaultValue="schedule"
        className="mt-4"
      >
        <TabsList>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="control">Schedule control</TabsTrigger>
          <TabsTrigger value="reports">Program report</TabsTrigger>
          <TabsTrigger value="reminders">Reminder bucket</TabsTrigger>
          <TabsTrigger value="themes">TV themes</TabsTrigger>
        </TabsList>

        <TabsContent
          value="schedule"
          className="mt-4 space-y-4"
        >
          <div className="flex flex-wrap gap-2">
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
              variant="default"
              size="sm"
              disabled={saving || loading || !orderedIds.length}
              onClick={() => void save()}
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Save order"
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => void deactivateTv()}
            >
              Deactivate TV
            </Button>
          </div>

          <div className="mt-4 max-w-lg space-y-4">
            {globalBans.length > 0 ? (
              <div className="rounded-md border border-amber-200 bg-amber-50/80 p-3 text-xs dark:border-amber-900 dark:bg-amber-950/30">
                <p className="font-medium text-amber-900 dark:text-amber-200">
                  Globally banned from TV (cannot be overridden by community)
                </p>
                <ul className="text-muted-foreground mt-2 space-y-1">
                  {globalBans.map(b => (
                    <li key={b.id}>
                      {b.eventChannel.title}
                      {b.eventChannel.faultReason
                        ? ` · ${b.eventChannel.faultReason}`
                        : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {communityExclusions.length > 0 ? (
              <div className="rounded-md border p-3 text-xs">
                <p className="font-medium">Community exclusions</p>
                <ul className="mt-2 space-y-1">
                  {communityExclusions.map(b => (
                    <li
                      key={b.id}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="text-muted-foreground">
                        {b.eventChannel.title}
                        {b.eventChannel.playbackStatus &&
                        b.eventChannel.playbackStatus !== "OK" ? (
                          <span className="ml-1 text-amber-600">
                            ({b.eventChannel.playbackStatus})
                          </span>
                        ) : null}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 shrink-0 text-xs"
                        onClick={async () => {
                          const token = authToken;
                          if (!token || !communityId) return;
                          try {
                            const res = await fetch(
                              `${base}/communities/${encodeURIComponent(communityId)}/tv/content-blocks/${encodeURIComponent(b.eventChannelId)}`,
                              {
                                method: "DELETE",
                                headers: { Authorization: `Bearer ${token}` },
                              }
                            );
                            if (!res.ok) {
                              const t = await res.text();
                              throw new Error(t || "Remove failed");
                            }
                            await Promise.all([load(), loadBlocks()]);
                          } catch (e) {
                            setError(
                              e instanceof Error ? e.message : "Remove failed"
                            );
                          }
                        }}
                      >
                        Remove
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <p className="text-muted-foreground text-xs font-medium">
              Find approved bank clips (search only — schedule is built by cron
              from the bank)
            </p>
            <div className="flex gap-2">
              <Input
                value={channelSearch}
                onChange={e => setChannelSearch(e.target.value)}
                placeholder="Title or event name (min 2 chars)"
                className="text-sm"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={channelSearchLoading}
                onClick={() => void searchChannels()}
              >
                Search
              </Button>
            </div>
            {channelHits.length > 0 ? (
              <ul className="text-muted-foreground max-h-40 overflow-auto rounded-md border text-xs">
                {channelHits.map(h => (
                  <li
                    key={h.id}
                    className="flex items-center justify-between gap-2 border-b px-2 py-1 last:border-b-0"
                  >
                    <span>
                      {h.title}
                      {h.eventName ? ` · ${h.eventName}` : ""}
                      {h.tvPlayable === false || h.globallyBanned ? (
                        <span className="ml-1 text-amber-600">
                          [{h.tvPlayable === false ? "not playable" : null}
                          {h.globallyBanned ? "globally banned" : null}
                          {h.playbackStatus && h.liveStatus
                            ? ` · ${h.playbackStatus}/${h.liveStatus}`
                            : null}
                          {h.faultReason ? `: ${h.faultReason}` : null}]
                        </span>
                      ) : h.playbackStatus && h.playbackStatus !== "OK" ? (
                        <span className="ml-1 text-amber-600">
                          [{h.playbackStatus}
                          {h.faultReason ? `: ${h.faultReason}` : ""}]
                        </span>
                      ) : null}
                    </span>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="h-7 shrink-0 text-xs"
                      onClick={async () => {
                        const token = authToken;
                        if (!token || !communityId) return;
                        try {
                          const res = await fetch(
                            `${base}/communities/${encodeURIComponent(communityId)}/tv/content-blocks/exclude`,
                            {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`,
                              },
                              body: JSON.stringify({
                                eventChannelId: h.id,
                                reason: "Host excluded from Community TV",
                              }),
                            }
                          );
                          if (!res.ok) {
                            const t = await res.text();
                            let msg = t || "Exclude failed";
                            try {
                              const parsed = JSON.parse(t) as {
                                message?: string;
                              };
                              if (parsed.message) msg = parsed.message;
                            } catch {
                              /* plain text */
                            }
                            throw new Error(msg);
                          }
                          await Promise.all([load(), loadBlocks()]);
                        } catch (e) {
                          setError(
                            e instanceof Error ? e.message : "Exclude failed"
                          );
                        }
                      }}
                    >
                      Exclude
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {error ? (
            <p className="text-destructive mt-4 text-sm">{error}</p>
          ) : null}

          {loading ? (
            <p className="text-muted-foreground mt-6 text-sm">Loading…</p>
          ) : orderedIds.length === 0 ? null : (
            <>
              <h3 className="mt-6 text-sm font-semibold">
                {ongoingBatchTitle}
              </h3>
              <ul className="mt-2 divide-y rounded-lg border">
                {orderedIds.map((id, idx) => (
                  <li
                    key={id}
                    className="flex items-center gap-2 px-3 py-2 text-sm"
                  >
                    <span className="text-muted-foreground w-6">{idx + 1}</span>
                    <span className="min-w-0 flex-1 truncate">
                      {labels[id] ?? id}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      aria-label="Move up"
                      onClick={() => move(idx, -1)}
                      disabled={idx === 0}
                    >
                      <ArrowUp className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      aria-label="Move down"
                      onClick={() => move(idx, 1)}
                      disabled={idx === orderedIds.length - 1}
                    >
                      <ArrowDown className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {!loading && orderedIds.length > 0 ? (
            <p className="text-muted-foreground mt-4 text-xs">
              Revision {revision}. Items lock at and before the live play head;
              only tail order changes are saved.
            </p>
          ) : null}

          {upcomingItems.length > 0 ? (
            <div className="mt-10">
              <h3 className="text-sm font-semibold">{upcomingBatchTitle}</h3>
              {upcomingRevision != null ? (
                <p className="text-muted-foreground text-xs">
                  Revision {upcomingRevision} (next 12h window — preview only)
                </p>
              ) : null}
              <ul className="mt-3 divide-y rounded-lg border">
                {upcomingItems.map((r, idx) => (
                  <li
                    key={r.id || idx}
                    className="text-muted-foreground px-3 py-2 text-sm"
                  >
                    {r.blockTitle ||
                      r.channel?.title ||
                      `Clip ${r.channel?.id?.slice(0, 8) ?? idx}`}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </TabsContent>

        <TabsContent
          value="control"
          className="mt-4"
        >
          <CommunityTvEnforcementHostTab
            communityId={communityId}
            apiBase={base}
          />
        </TabsContent>

        <TabsContent
          value="reports"
          className="mt-4"
        >
          <CommunityTvProgramReportHostTab
            communityId={communityId}
            apiBase={base}
          />
        </TabsContent>

        <TabsContent
          value="reminders"
          className="mt-4"
        >
          <HostReminderBucketTab communityId={communityId} />
        </TabsContent>

        <TabsContent value="themes">
          <CommunityTvAdjustmentHostTab
            communityId={communityId}
            apiBase={base}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}
