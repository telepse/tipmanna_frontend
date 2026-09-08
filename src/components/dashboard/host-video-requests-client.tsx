"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";

import { DashboardHeading } from "@/components/dashboard/dashboard-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  addWhitelistHostAction,
  approveInboxVideoRequestAction,
  cancelSentVideoRequestAction,
  checkVideoRequestEligibilityAction,
  createVideoRequestAction,
  deleteWhitelistEntryAction,
  getVideoRequestPrefsAction,
  listInboxVideoRequestsAction,
  listMyVideosForVideoRequestsAction,
  listSentVideoRequestsAction,
  patchVideoRequestPrefsAction,
  rejectInboxVideoRequestAction,
} from "@/actions/video-requests";
import type { RootState } from "@/redux/store";
import { subscribeChannel, unsubscribeChannel } from "@/lib/pusher";

type EventRow = {
  id: string;
  eventName: string;
  channels: Array<{
    id: string;
    title: string;
    url: string;
    description?: string;
  }>;
};

type VideoRequestSent = {
  id: string;
  kind?: string;
  status?: string;
  createdAt?: string;
  desiredEarliestAt?: string;
  desiredLatestAt?: string;
  approvedFromAt?: string;
  approvedUntilAt?: string;
  targetChannel?: { title?: string; id?: string };
  sourceChannel?: { title?: string; id?: string };
  card?: { id?: string; active?: boolean; fromAt?: string; untilAt?: string };
  rollup?: {
    impressions?: number;
    miniExpands?: number;
    maxExpands?: number;
    tipsInMaxCount?: number;
    tipsInMaxGbp?: number;
  } | null;
};

type VideoRequestInbox = {
  id: string;
  kind?: string;
  status?: string;
  createdAt?: string;
  requestedByHost?: {
    fullName?: string;
    username?: string;
    email?: string;
  };
  sourceChannel?: { title?: string; id?: string };
  targetChannel?: { title?: string; id?: string };
};

function formatRollupMetrics(
  rollup: VideoRequestSent["rollup"]
): string | null {
  if (!rollup) return null;
  const parts: string[] = [];
  if (typeof rollup.impressions === "number") {
    parts.push(`${rollup.impressions} encounters`);
  }
  if (typeof rollup.miniExpands === "number") {
    parts.push(`${rollup.miniExpands} card clicks`);
  }
  if (typeof rollup.maxExpands === "number") {
    parts.push(`${rollup.maxExpands} overlay opens`);
  }
  if (typeof rollup.tipsInMaxCount === "number") {
    parts.push(`${rollup.tipsInMaxCount} tips`);
  }
  if (typeof rollup.tipsInMaxGbp === "number" && rollup.tipsInMaxGbp > 0) {
    parts.push(`£${rollup.tipsInMaxGbp.toFixed(2)} from overlay`);
  }
  return parts.length ? parts.join(" · ") : null;
}

const ACCEPT_MODES = [
  "everyone",
  "premium_only",
  "whitelist",
  "nobody",
] as const;

export function HostVideoRequestsClient() {
  const userId = useSelector((s: RootState) => s.auth.user?.id);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [sent, setSent] = useState<VideoRequestSent[]>([]);
  const [inbox, setInbox] = useState<VideoRequestInbox[]>([]);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [prefs, setPrefs] = useState<{
    featureAcceptMode: string;
  } | null>(null);
  const [whitelist, setWhitelist] = useState<
    Array<{ id: string; allowedRequesterHostId: string }>
  >([]);
  const [whitelistInput, setWhitelistInput] = useState("");

  const [featEventId, setFeatEventId] = useState("");
  const [featChannelId, setFeatChannelId] = useState("");
  const [featTargetUrl, setFeatTargetUrl] = useState("");
  const [featHours, setFeatHours] = useState("48");
  const [checkMsg, setCheckMsg] = useState<string | null>(null);

  const [tvSourceEventId, setTvSourceEventId] = useState("");
  const [tvSourceChannelId, setTvSourceChannelId] = useState("");
  const [tvReason, setTvReason] = useState("");
  const [tvNote, setTvNote] = useState("");
  const [tvWindowStart, setTvWindowStart] = useState("");
  const [tvWindowEnd, setTvWindowEnd] = useState("");

  const [approveHours, setApproveHours] = useState<Record<string, string>>({});

  const loadVideos = useCallback(async () => {
    if (!userId) return;
    const r = await listMyVideosForVideoRequestsAction();
    if (!r.success || !r.data) return;
    const evs = Array.isArray((r.data as { events?: unknown }).events)
      ? ((r.data as { events: EventRow[] }).events ?? [])
      : [];
    setEvents(evs);
  }, [userId]);

  const loadSent = useCallback(async () => {
    if (!userId) return;
    const r = await listSentVideoRequestsAction();
    if (!r.success || !r.data?.requests) return;
    setSent((r.data.requests as VideoRequestSent[]) ?? []);
  }, [userId]);

  const loadInbox = useCallback(async () => {
    if (!userId) return;
    const r = await listInboxVideoRequestsAction();
    if (!r.success || !r.data?.requests) return;
    setInbox((r.data.requests as VideoRequestInbox[]) ?? []);
  }, [userId]);

  const loadPrefs = useCallback(async () => {
    if (!userId) {
      setPrefsLoading(false);
      return;
    }
    setPrefsLoading(true);
    const r = await getVideoRequestPrefsAction();
    if (!r.success || !r.data) {
      toast.error(r.message ?? "Could not load settings");
      setPrefsLoading(false);
      return;
    }
    const p = r.data.preferences as { featureAcceptMode?: string } | null;
    setPrefs({ featureAcceptMode: p?.featureAcceptMode ?? "everyone" });
    const wl = Array.isArray(r.data.whitelist) ? r.data.whitelist : [];
    setWhitelist(
      wl.map(row => ({
        id: String((row as { id: string }).id),
        allowedRequesterHostId: String(
          (row as { allowedRequesterHostId: string }).allowedRequesterHostId
        ),
      }))
    );
    setPrefsLoading(false);
  }, [userId]);

  useEffect(() => {
    void loadVideos();
    void loadSent();
    void loadInbox();
    void loadPrefs();
  }, [loadVideos, loadSent, loadInbox, loadPrefs]);

  useEffect(() => {
    if (!userId) return;
    const channelName = `community-host-${userId}`;
    const channel = subscribeChannel(channelName);
    if (!channel) return;

    const onVideoRequestUpdate = () => {
      void loadInbox();
      void loadSent();
    };
    channel.bind("video-request-update", onVideoRequestUpdate);

    return () => {
      channel.unbind("video-request-update", onVideoRequestUpdate);
      unsubscribeChannel(channelName);
    };
  }, [userId, loadInbox, loadSent]);

  const featEvent = useMemo(
    () => events.find(e => e.id === featEventId),
    [events, featEventId]
  );
  const tvEvent = useMemo(
    () => events.find(e => e.id === tvSourceEventId),
    [events, tvSourceEventId]
  );

  const onCheckFeature = async () => {
    if (!userId || !featChannelId || !featTargetUrl.trim()) {
      toast.error("Pick your video channel and enter a Tipmanna target URL.");
      return;
    }
    const qs = new URLSearchParams({
      kind: "feature",
      sourceChannelId: featChannelId,
      targetUrl: featTargetUrl.trim(),
    });
    const r = await checkVideoRequestEligibilityAction(qs);
    if (!r.success) {
      setCheckMsg(r.message ?? "Check failed");
      toast.error(r.message ?? "Check failed");
      return;
    }
    const body = r.data as { eligible?: boolean; reason?: string };
    if (body.eligible) {
      setCheckMsg("Eligible — you can submit this request.");
      toast.success("Eligible");
    } else {
      setCheckMsg(body.reason ?? "Not eligible.");
      toast.error(body.reason ?? "Not eligible.");
    }
  };

  const onSubmitFeature = async () => {
    if (!userId || !featChannelId || !featTargetUrl.trim()) return;
    const r = await createVideoRequestAction({
      kind: "feature",
      sourceChannelId: featChannelId,
      targetVideoUrl: featTargetUrl.trim(),
      approvalDurationHours: Number(featHours) || 48,
    });
    if (!r.success) {
      toast.error(r.message ?? "Submit failed");
      return;
    }
    toast.success("Feature request submitted");
    setFeatTargetUrl("");
    setCheckMsg(null);
    void loadSent();
  };

  const onSubmitTv = async () => {
    if (!userId || !tvSourceChannelId) return;
    if (!tvWindowStart || !tvWindowEnd) {
      toast.error("Pick a future 7-day window for TV placement.");
      return;
    }
    const r = await createVideoRequestAction({
      kind: "tv_feature",
      sourceChannelId: tvSourceChannelId,
      reason: tvReason,
      desiredSlotNote: tvNote,
      desiredEarliestAt: new Date(tvWindowStart).toISOString(),
      desiredLatestAt: new Date(tvWindowEnd).toISOString(),
    });
    if (!r.success) {
      toast.error(r.message ?? "Submit failed");
      return;
    }
    toast.success("TV feature request submitted");
    setTvReason("");
    setTvNote("");
    setTvWindowStart("");
    setTvWindowEnd("");
    void loadSent();
  };

  const onCancelSent = async (id: string) => {
    if (!userId) return;
    const r = await cancelSentVideoRequestAction(id);
    if (!r.success) {
      toast.error(r.message ?? "Cancel failed");
      return;
    }
    toast.success("Cancelled");
    void loadSent();
  };

  const onApproveInbox = async (id: string) => {
    if (!userId) return;
    const h = Number(approveHours[id] ?? "48") || 48;
    const r = await approveInboxVideoRequestAction(id, {
      approvalDurationHours: h,
    });
    if (!r.success) {
      toast.error(r.message ?? "Approve failed");
      return;
    }
    toast.success("Approved — featured card scheduled");
    void loadInbox();
    void loadSent();
  };

  const onRejectInbox = async (id: string) => {
    if (!userId) return;
    const notes = window.prompt("Optional note to the requester") ?? "";
    const r = await rejectInboxVideoRequestAction(id, notes);
    if (!r.success) {
      toast.error(r.message ?? "Reject failed");
      return;
    }
    toast.success("Rejected");
    void loadInbox();
  };

  const onPatchMode = async (mode: string) => {
    if (!userId) return;
    const r = await patchVideoRequestPrefsAction(mode);
    if (!r.success) {
      toast.error(r.message ?? "Could not save");
      return;
    }
    toast.success("Saved");
    void loadPrefs();
  };

  const onAddWhitelist = async () => {
    if (!userId || !whitelistInput.trim()) return;
    const r = await addWhitelistHostAction(whitelistInput.trim());
    if (!r.success) {
      toast.error(r.message ?? "Add failed");
      return;
    }
    setWhitelistInput("");
    toast.success("Whitelisted host");
    void loadPrefs();
  };

  const onRemoveWhitelist = async (entryId: string) => {
    if (!userId) return;
    const r = await deleteWhitelistEntryAction(entryId);
    if (!r.success) {
      toast.error(r.message ?? "Remove failed");
      return;
    }
    toast.success("Removed");
    void loadPrefs();
  };

  return (
    <div className="bg-card space-y-6 rounded-md border p-4 sm:p-6">
      <div className="space-y-2">
        <h3 className="text-xl font-semibold sm:text-2xl">Video requests</h3>
        <p className="text-muted-foreground text-sm">
          Ask to feature clips on others&apos; Tipmanna videos or request TV
          placements.
        </p>
      </div>

      <Tabs defaultValue="send">
        <TabsList className="bg-secondary/30 grid h-auto w-full grid-cols-2 gap-1 rounded-lg p-1 sm:grid-cols-4">
          <TabsTrigger
            value="send"
            className="rounded-md px-4 py-3 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm"
          >
            Send requests
          </TabsTrigger>

          <TabsTrigger
            value="outgoing"
            className="rounded-md px-4 py-3 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm"
          >
            Outgoing
          </TabsTrigger>

          <TabsTrigger
            value="inbox"
            className="rounded-md px-4 py-3 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm"
          >
            Inbox
          </TabsTrigger>

          <TabsTrigger
            value="settings"
            className="rounded-md px-4 py-3 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm"
          >
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="send"
          className="space-y-6 pt-4 sm:space-y-8"
        >
          {/* Cross-video feature */}
          <section className="rounded-md border bg-white p-4 sm:p-6">
            <div className="border-b pb-4">
              <h3 className="text-base font-semibold sm:text-lg">
                Cross-video feature
              </h3>

              <p className="text-muted-foreground mt-1 max-w-2xl text-sm leading-relaxed">
                Promote one of your videos as a banner on another Tipmanna
                playback. Same-host uploads can auto-approve.
              </p>
            </div>

            <div className="mt-5 grid gap-4 sm:max-w-xl">
              {/* Event */}
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Your event</label>

                <select
                  className="border-input bg-background focus:ring-primary/20 h-10 w-full cursor-pointer rounded-md border px-3 text-sm transition outline-none focus:ring-2"
                  value={featEventId}
                  onChange={e => {
                    setFeatEventId(e.target.value);
                    setFeatChannelId("");
                  }}
                >
                  <option
                    value=""
                    className="cursor-pointer"
                  >
                    Choose event
                  </option>

                  {events.map(e => (
                    <option
                      key={e.id}
                      value={e.id}
                      className="cursor-pointer"
                    >
                      {e.eventName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Video */}
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">
                  Your video channel
                </label>

                <select
                  className="border-input bg-background focus:ring-primary/20 h-10 w-full cursor-pointer rounded-md border px-3 text-sm transition outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={featChannelId}
                  onChange={e => setFeatChannelId(e.target.value)}
                  disabled={!featEvent}
                >
                  <option
                    value=""
                    className="cursor-pointer"
                  >
                    Choose clip
                  </option>

                  {(featEvent?.channels ?? []).map(c => (
                    <option
                      key={c.id}
                      value={c.id}
                      className="cursor-pointer"
                    >
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target URL */}
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Target video URL</label>

                <p className="text-muted-foreground text-xs">
                  Enter the Tipmanna video URL or share link where you want your
                  video featured.
                </p>

                <Input
                  value={featTargetUrl}
                  onChange={e => setFeatTargetUrl(e.target.value)}
                  placeholder="https://…"
                  className="h-10"
                />
              </div>

              {/* Duration + actions */}
              <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-end">
                <div className="grid gap-1.5">
                  <label className="text-sm font-medium">
                    Hours
                    <span className="text-muted-foreground ml-1 text-xs">
                      (same-host)
                    </span>
                  </label>

                  <Input
                    type="number"
                    min={1}
                    max={168}
                    className="h-10 w-full sm:w-28"
                    value={featHours}
                    onChange={e => setFeatHours(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => void onCheckFeature()}
                  >
                    Check eligibility
                  </Button>

                  <Button
                    type="button"
                    className="w-full sm:w-auto"
                    onClick={() => void onSubmitFeature()}
                  >
                    Submit
                  </Button>
                </div>
              </div>

              {checkMsg ? (
                <div className="bg-muted rounded-md px-3 py-2">
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {checkMsg}
                  </p>
                </div>
              ) : null}
            </div>
          </section>

          {/* Tipmanna TV feature */}
          <section className="rounded-md border bg-white p-4 sm:p-6">
            <div className="border-b pb-4">
              <h3 className="text-base font-semibold sm:text-lg">
                Tipmanna TV feature
              </h3>

              <p className="text-muted-foreground mt-1 max-w-2xl text-sm leading-relaxed">
                Admin-reviewed placement on in-app TV loops.
              </p>
            </div>

            <div className="mt-5 grid gap-4 sm:max-w-xl">
              {/* Source event */}
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Source event</label>

                <select
                  className="border-input bg-background focus:ring-primary/20 h-10 w-full cursor-pointer rounded-md border px-3 text-sm transition outline-none focus:ring-2"
                  value={tvSourceEventId}
                  onChange={e => {
                    setTvSourceEventId(e.target.value);
                    setTvSourceChannelId("");
                  }}
                >
                  <option value="">Choose event</option>

                  {events.map(e => (
                    <option
                      key={e.id}
                      value={e.id}
                    >
                      {e.eventName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Source clip */}
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Source clip</label>

                <select
                  className="border-input bg-background focus:ring-primary/20 h-10 w-full cursor-pointer rounded-md border px-3 text-sm transition outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={tvSourceChannelId}
                  onChange={e => setTvSourceChannelId(e.target.value)}
                  disabled={!tvEvent}
                >
                  <option value="">Choose clip</option>

                  {(tvEvent?.channels ?? []).map(c => (
                    <option
                      key={c.id}
                      value={c.id}
                    >
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reason */}
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Why it fits TV</label>

                <Textarea
                  rows={4}
                  value={tvReason}
                  onChange={e => setTvReason(e.target.value)}
                  className="resize-none"
                  placeholder="Explain why this video would be a good fit for Tipmanna TV..."
                />
              </div>

              {/* Preferred window (max 7 days, must start in the future) */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <label className="text-sm font-medium">Window start</label>
                  <Input
                    type="datetime-local"
                    value={tvWindowStart}
                    onChange={e => setTvWindowStart(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-sm font-medium">Window end</label>
                  <Input
                    type="datetime-local"
                    value={tvWindowEnd}
                    onChange={e => setTvWindowEnd(e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>

              {/* Preferred slot */}
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">
                  Preferred slot note
                  <span className="text-muted-foreground ml-1 text-xs">
                    (optional)
                  </span>
                </label>

                <Input
                  value={tvNote}
                  onChange={e => setTvNote(e.target.value)}
                  placeholder="e.g. Evening rotation"
                  className="h-10"
                />
              </div>

              {/* Submit */}
              <div className="pt-1">
                <Button
                  type="button"
                  className="w-full sm:w-fit"
                  onClick={() => void onSubmitTv()}
                >
                  Submit TV request
                </Button>
              </div>
            </div>
          </section>
        </TabsContent>

        <TabsContent
          value="outgoing"
          className="space-y-3 pt-4"
        >
          {sent.length === 0 ? (
            <p className="text-muted-foreground text-sm">No requests yet.</p>
          ) : (
            sent.map(row => (
              <div
                key={row.id}
                className="bg-muted/30 rounded-lg border p-3 text-sm"
              >
                <p className="font-medium">
                  {(row.kind ?? "—").replace(/_/g, " ")} · {row.status}
                </p>
                <p className="text-muted-foreground text-xs">
                  {row.createdAt
                    ? new Date(row.createdAt).toLocaleString()
                    : row.id}{" "}
                  · Target: {row.targetChannel?.title ?? "—"}
                </p>
                {row.card?.active ? (
                  <p className="text-muted-foreground mt-1 text-[11px]">
                    Active card · from {String(row.card.fromAt ?? "")}
                  </p>
                ) : null}
                {formatRollupMetrics(row.rollup) ? (
                  <p className="text-muted-foreground mt-1 text-[11px]">
                    {formatRollupMetrics(row.rollup)}
                  </p>
                ) : null}
                {row.kind === "tv_feature" &&
                (row.desiredEarliestAt || row.approvedFromAt) ? (
                  <p className="text-muted-foreground mt-1 text-[11px]">
                    Window:{" "}
                    {row.approvedFromAt
                      ? new Date(row.approvedFromAt).toLocaleString()
                      : row.desiredEarliestAt
                        ? new Date(row.desiredEarliestAt).toLocaleString()
                        : "—"}{" "}
                    →{" "}
                    {row.approvedUntilAt
                      ? new Date(row.approvedUntilAt).toLocaleString()
                      : row.desiredLatestAt
                        ? new Date(row.desiredLatestAt).toLocaleString()
                        : "—"}
                  </p>
                ) : null}
                {row.status === "pending" ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => void onCancelSent(row.id)}
                  >
                    Cancel
                  </Button>
                ) : null}
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent
          value="inbox"
          className="space-y-3 pt-4"
        >
          {inbox.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No incoming cross-video requests.
            </p>
          ) : (
            inbox.map(row => (
              <div
                key={row.id}
                className="bg-muted/30 rounded-lg border p-3 text-sm"
              >
                <p className="font-medium">
                  From{" "}
                  {row.requestedByHost?.username ??
                    row.requestedByHost?.fullName ??
                    "host"}
                </p>
                <p className="text-muted-foreground text-xs">
                  Their clip:{" "}
                  {row.sourceChannel?.title ?? row.sourceChannel?.id}· your
                  video:{" "}
                  {row.targetChannel?.title ?? row.targetChannel?.id ?? "—"}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Input
                    className="w-24 text-xs"
                    type="number"
                    min={1}
                    placeholder="hrs"
                    value={approveHours[row.id] ?? "48"}
                    onChange={e =>
                      setApproveHours(h => ({
                        ...h,
                        [row.id]: e.target.value,
                      }))
                    }
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void onApproveInbox(row.id)}
                  >
                    Approve
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => void onRejectInbox(row.id)}
                  >
                    Decline
                  </Button>
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent
          value="settings"
          className="space-y-6 pt-4"
        >
          {prefsLoading || !prefs ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : (
            <>
              <div className="max-w-md space-y-2">
                <h3 className="font-semibold">Who may request you?</h3>
                <p className="text-muted-foreground text-xs">
                  Applies to inbound cross-video feature requests.
                </p>
                <select
                  className="border-input bg-background rounded-md border px-3 py-2 text-sm"
                  value={prefs.featureAcceptMode}
                  onChange={e => {
                    const v = e.target.value;
                    setPrefs(p => (p ? { ...p, featureAcceptMode: v } : p));
                    void onPatchMode(v);
                  }}
                >
                  {ACCEPT_MODES.map(m => (
                    <option
                      key={m}
                      value={m}
                    >
                      {m.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>

              <div className="max-w-xl space-y-2">
                <h3 className="font-semibold">Whitelist hosts (by Host ID)</h3>
                <p className="text-muted-foreground text-xs">
                  Only used when acceptance mode is set to whitelist. Paste
                  another host’s internal ID (shown in dashboards or support
                  tickets).
                </p>
                <div className="flex flex-wrap gap-2">
                  <Input
                    value={whitelistInput}
                    onChange={e => setWhitelistInput(e.target.value)}
                    placeholder="Host UUID…"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void onAddWhitelist()}
                  >
                    Add
                  </Button>
                </div>
                <ul className="space-y-1 text-sm">
                  {whitelist.map(entry => (
                    <li
                      key={entry.id}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <code className="text-xs">
                        {entry.allowedRequesterHostId}
                      </code>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => void onRemoveWhitelist(entry.id)}
                      >
                        Remove
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
