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
  targetChannel?: { title?: string; id?: string };
  sourceChannel?: { title?: string; id?: string };
  card?: { id?: string; active?: boolean; fromAt?: string; untilAt?: string };
  rollup?: { impressions?: unknown } | null;
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

  const [globSourceEventId, setGlobSourceEventId] = useState("");
  const [globSourceChannelId, setGlobSourceChannelId] = useState("");
  const [globText, setGlobText] = useState("");

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
  const globEvent = useMemo(
    () => events.find(e => e.id === globSourceEventId),
    [events, globSourceEventId]
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
    const r = await createVideoRequestAction({
      kind: "tv_feature",
      sourceChannelId: tvSourceChannelId,
      reason: tvReason,
      desiredSlotNote: tvNote,
    });
    if (!r.success) {
      toast.error(r.message ?? "Submit failed");
      return;
    }
    toast.success("TV feature request submitted");
    setTvReason("");
    setTvNote("");
    void loadSent();
  };

  const onSubmitGlobal = async () => {
    if (!userId || !globSourceChannelId || !globText.trim()) {
      toast.error("Pick a channel and enter announcement copy.");
      return;
    }
    const r = await createVideoRequestAction({
      kind: "global_announce",
      sourceChannelId: globSourceChannelId,
      announcementText: globText.trim(),
    });
    if (!r.success) {
      toast.error(r.message ?? "Submit failed");
      return;
    }
    toast.success("Global announcement request submitted");
    setGlobText("");
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
    <div className="space-y-8 p-6">
      <DashboardHeading
        title="Video requests"
        subtitle="Ask to feature clips on others’ Tipmanna videos, request TV placements, or request a global spotlight card."
      />

      <Tabs defaultValue="send">
        <TabsList className="flex-wrap">
          <TabsTrigger value="send">Send requests</TabsTrigger>
          <TabsTrigger value="outgoing">Outgoing</TabsTrigger>
          <TabsTrigger value="inbox">Inbox</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent
          value="send"
          className="space-y-8 pt-4"
        >
          <section className="rounded-lg border p-4">
            <h3 className="font-semibold">Cross-video feature</h3>
            <p className="text-muted-foreground mt-1 text-xs">
              Promote one of your videos as a banner on another Tipmanna
              playback. Same-host uploads can auto-approve.
            </p>
            <div className="mt-3 grid gap-2 sm:max-w-xl">
              <label className="text-xs font-medium">Your event</label>
              <select
                className="border-input bg-background rounded-md border px-3 py-2 text-sm"
                value={featEventId}
                onChange={e => {
                  setFeatEventId(e.target.value);
                  setFeatChannelId("");
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
              <label className="text-xs font-medium">Your video channel</label>
              <select
                className="border-input bg-background rounded-md border px-3 py-2 text-sm"
                value={featChannelId}
                onChange={e => setFeatChannelId(e.target.value)}
                disabled={!featEvent}
              >
                <option value="">Choose clip</option>
                {(featEvent?.channels ?? []).map(c => (
                  <option
                    key={c.id}
                    value={c.id}
                  >
                    {c.title}
                  </option>
                ))}
              </select>
              <label className="text-xs font-medium">
                Tipmanna video URL or share link you want featured on (target)
              </label>
              <Input
                value={featTargetUrl}
                onChange={e => setFeatTargetUrl(e.target.value)}
                placeholder="https://…"
              />
              <div className="flex flex-wrap items-end gap-2">
                <div>
                  <label className="text-xs font-medium">
                    Hours (same-host)
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={168}
                    className="w-28"
                    value={featHours}
                    onChange={e => setFeatHours(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void onCheckFeature()}
                >
                  Check eligibility
                </Button>
                <Button
                  type="button"
                  onClick={() => void onSubmitFeature()}
                >
                  Submit
                </Button>
              </div>
              {checkMsg ? (
                <p className="text-muted-foreground text-xs">{checkMsg}</p>
              ) : null}
            </div>
          </section>

          <section className="rounded-lg border p-4">
            <h3 className="font-semibold">Tipmanna TV feature</h3>
            <p className="text-muted-foreground mt-1 text-xs">
              Admin-reviewed placement on in-app TV loops.
            </p>
            <div className="mt-3 grid gap-2 sm:max-w-xl">
              <label className="text-xs font-medium">Source event</label>
              <select
                className="border-input bg-background rounded-md border px-3 py-2 text-sm"
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
              <label className="text-xs font-medium">Source clip</label>
              <select
                className="border-input bg-background rounded-md border px-3 py-2 text-sm"
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
              <label className="text-xs font-medium">Why it fits TV</label>
              <Textarea
                rows={4}
                value={tvReason}
                onChange={e => setTvReason(e.target.value)}
              />
              <label className="text-xs font-medium">
                Preferred slot note (optional)
              </label>
              <Input
                value={tvNote}
                onChange={e => setTvNote(e.target.value)}
              />
              <Button
                type="button"
                className="w-fit"
                onClick={() => void onSubmitTv()}
              >
                Submit TV request
              </Button>
            </div>
          </section>

          {/* <section className="rounded-lg border p-4">
            <h3 className="font-semibold">Global announcement card</h3>
            <p className="text-muted-foreground mt-1 text-xs">
              Request platform-wide spotlight; ops approves wording and timing.
            </p>
            <div className="mt-3 grid gap-2 sm:max-w-xl">
              <label className="text-xs font-medium">Backed by clip</label>
              <select
                className="border-input bg-background rounded-md border px-3 py-2 text-sm"
                value={globSourceEventId}
                onChange={e => {
                  setGlobSourceEventId(e.target.value);
                  setGlobSourceChannelId("");
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
              <select
                className="border-input bg-background rounded-md border px-3 py-2 text-sm"
                value={globSourceChannelId}
                onChange={e => setGlobSourceChannelId(e.target.value)}
                disabled={!globEvent}
              >
                <option value="">Choose clip</option>
                {(globEvent?.channels ?? []).map(c => (
                  <option
                    key={c.id}
                    value={c.id}
                  >
                    {c.title}
                  </option>
                ))}
              </select>
              <label className="text-xs font-medium">Announcement</label>
              <Textarea
                rows={4}
                value={globText}
                onChange={e => setGlobText(e.target.value)}
                maxLength={2000}
              />
              <Button
                type="button"
                className="w-fit"
                onClick={() => void onSubmitGlobal()}
              >
                Submit global request
              </Button>
            </div>
          </section> */}
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
