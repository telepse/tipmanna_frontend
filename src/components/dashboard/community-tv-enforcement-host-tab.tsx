"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "react-toastify";

import {
  getCommunityTvEnforcementAutoApproveStatusAction,
  getCommunityTvEnforcementHistoryAction,
  postCommunityTvEnforcementDraftAction,
  postCommunityTvEnforcementLifecycleAction,
  searchCommunityTvChannelsAction,
} from "@/actions/community-tv-host";
import { patchCommunityProgramLandingBannerAction } from "@/actions/program-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  communityProgramLandingUrl,
  copyProgramLink,
} from "@/lib/program-share";

type EnforcementRow = {
  id: string;
  status: string;
  title: string;
  scheduledAt: string;
  kind: string;
  landingBannerUrl?: string | null;
  rejectionReason?: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending approval",
  AUTHORIZED: "Authorized",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  REVOKED: "Revoked",
  ARCHIVED: "Archived",
  WITHDRAWN: "Withdrawn",
  REVOCATION_REQUESTED: "Revocation requested",
};

export function CommunityTvEnforcementHostTab({
  communityId,
}: {
  communityId: string;
  apiBase?: string;
}) {
  const [autoApprove, setAutoApprove] = useState(false);
  const [history, setHistory] = useState<EnforcementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [kind, setKind] = useState<"VIDEO" | "PROGRAM">("PROGRAM");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQ, setSearchQ] = useState("");
  const [searchHits, setSearchHits] = useState<
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
  const [busy, setBusy] = useState(false);
  const [bannerDrafts, setBannerDrafts] = useState<Record<string, string>>({});
  const [bannerSavingId, setBannerSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [histRes, aaRes] = await Promise.all([
        getCommunityTvEnforcementHistoryAction(communityId),
        getCommunityTvEnforcementAutoApproveStatusAction(communityId),
      ]);
      if (histRes.success && histRes.data) {
        setHistory((histRes.data.items ?? []) as EnforcementRow[]);
      }
      if (aaRes.success && aaRes.data) {
        setAutoApprove(Boolean(aaRes.data.autoApprove));
      }
    } catch {
      toast.error("Could not load enforcement data");
    } finally {
      setLoading(false);
    }
  }, [communityId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSearch = async () => {
    const q = searchQ.trim();
    if (q.length < 2) {
      toast.info("Enter at least 2 characters");
      return;
    }
    try {
      const res = await searchCommunityTvChannelsAction(communityId, q);
      if (!res.success || !res.data) throw new Error("search failed");
      setSearchHits((res.data.items ?? []) as typeof searchHits);
    } catch {
      toast.error("Channel search failed");
    }
  };

  const toggleChannel = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const saveDraft = async () => {
    if (!title.trim() || !scheduledAt || selectedIds.length === 0) {
      toast.error("Title, scheduled time, and channels required");
      return;
    }
    setBusy(true);
    try {
      const res = await postCommunityTvEnforcementDraftAction(communityId, {
        kind,
        title: title.trim(),
        scheduledAt: new Date(scheduledAt).toISOString(),
        channelIds: selectedIds,
      });
      if (!res.success) {
        throw new Error(res.message ?? res.error ?? "Draft failed");
      }
      toast.success("Draft saved");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Draft failed");
    } finally {
      setBusy(false);
    }
  };

  const saveLandingBanner = async (enforcementId: string) => {
    const url = (bannerDrafts[enforcementId] ?? "").trim();
    if (!url) {
      toast.error("Enter a banner image URL");
      return;
    }
    setBannerSavingId(enforcementId);
    try {
      const res = await patchCommunityProgramLandingBannerAction(
        communityId,
        enforcementId,
        url
      );
      if (!res.success) {
        throw new Error(res.message ?? res.error ?? "Save failed");
      }
      toast.success("Landing banner updated");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save banner");
    } finally {
      setBannerSavingId(null);
    }
  };

  const act = async (
    action: "submit" | "withdraw" | "revocation-request" | "cancel-revocation",
    enforcementId: string,
    label: string
  ) => {
    setBusy(true);
    try {
      const res = await postCommunityTvEnforcementLifecycleAction(
        communityId,
        enforcementId,
        action
      );
      if (!res.success) {
        throw new Error(res.message ?? res.error ?? "Action failed");
      }
      toast.success(label);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const actionable = useMemo(
    () =>
      history.filter(h => h.status !== "ARCHIVED" && h.status !== "WITHDRAWN"),
    [history]
  );

  if (loading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 py-8">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading schedule control…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div
        className={`rounded-lg border p-4 text-sm ${
          autoApprove
            ? "border-emerald-500/40 bg-emerald-500/5"
            : "border-amber-500/40 bg-amber-500/5"
        }`}
      >
        {autoApprove
          ? "Trust mode: your enforcements are authorized immediately when you submit (admin is notified)."
          : "Each enforcement requires admin approval before it airs on your community TV."}
      </div>

      <section className="space-y-3 rounded-lg border p-4">
        <h3 className="font-medium">New enforcement draft</h3>
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Block title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="max-w-xs"
          />
          <Input
            type="datetime-local"
            value={scheduledAt}
            onChange={e => setScheduledAt(e.target.value)}
            className="max-w-xs"
          />
          <select
            className="rounded-md border px-2 py-2 text-sm"
            value={kind}
            onChange={e => setKind(e.target.value as "VIDEO" | "PROGRAM")}
          >
            <option value="PROGRAM">Program</option>
            <option value="VIDEO">Video</option>
          </select>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Search community bank channels"
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            className="max-w-sm"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => void onSearch()}
          >
            Search
          </Button>
        </div>
        <ul className="max-h-40 space-y-1 overflow-y-auto text-sm">
          {searchHits.map(c => (
            <li key={c.id}>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(c.id)}
                  onChange={() => toggleChannel(c.id)}
                />
                <span>
                  {c.title}
                  {c.eventName ? ` — ${c.eventName}` : ""}
                  {c.tvPlayable === false || c.globallyBanned ? (
                    <span className="ml-1 text-xs text-amber-600">
                      [{c.tvPlayable === false ? "not playable" : null}
                      {c.globallyBanned ? "globally banned" : null}
                      {c.playbackStatus && c.liveStatus
                        ? ` · ${c.playbackStatus}/${c.liveStatus}`
                        : null}
                      {c.faultReason ? ` · ${c.faultReason}` : null}]
                    </span>
                  ) : c.playbackStatus &&
                    (c.playbackStatus !== "OK" ||
                      c.liveStatus !== "NOT_LIVE") ? (
                    <span className="ml-1 text-xs text-amber-600">
                      [{c.playbackStatus}/{c.liveStatus}
                      {c.faultReason ? `: ${c.faultReason}` : ""}]
                    </span>
                  ) : null}
                </span>
              </label>
            </li>
          ))}
        </ul>
        <Button
          type="button"
          disabled={busy}
          onClick={() => void saveDraft()}
        >
          Save draft
        </Button>
      </section>

      <section className="space-y-3 rounded-lg border p-4">
        <h3 className="font-medium">Your enforcements</h3>
        {actionable.length === 0 ? (
          <p className="text-muted-foreground text-sm">No enforcements yet.</p>
        ) : (
          <ul className="space-y-3">
            {actionable.map(row => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded border p-3 text-sm"
              >
                <div>
                  <div className="font-medium">{row.title}</div>
                  <div className="text-muted-foreground">
                    {STATUS_LABEL[row.status] ?? row.status} · {row.kind} ·{" "}
                    {new Date(row.scheduledAt).toLocaleString()}
                  </div>
                  {row.rejectionReason ? (
                    <p className="text-destructive mt-1">
                      Rejected: {row.rejectionReason}
                    </p>
                  ) : null}
                  {["AUTHORIZED", "ACTIVE", "COMPLETED"].includes(
                    row.status
                  ) ? (
                    <div className="bg-muted/20 mt-3 space-y-2 rounded-md border p-3">
                      <p className="text-xs font-medium">
                        Program landing banner
                      </p>
                      {row.landingBannerUrl ? (
                        <img
                          src={row.landingBannerUrl}
                          alt=""
                          className="h-16 max-w-full rounded border object-cover"
                        />
                      ) : null}
                      <div className="flex flex-wrap items-end gap-2">
                        <div className="min-w-[12rem] flex-1 space-y-1">
                          <Label
                            htmlFor={`banner-${row.id}`}
                            className="text-xs"
                          >
                            Banner image URL
                          </Label>
                          <Input
                            id={`banner-${row.id}`}
                            type="url"
                            placeholder="https://…"
                            value={
                              bannerDrafts[row.id] ?? row.landingBannerUrl ?? ""
                            }
                            onChange={e =>
                              setBannerDrafts(prev => ({
                                ...prev,
                                [row.id]: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={bannerSavingId === row.id}
                          onClick={() => void saveLandingBanner(row.id)}
                        >
                          {bannerSavingId === row.id
                            ? "Saving…"
                            : "Save banner"}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {row.status === "DRAFT" ? (
                    <>
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          void act(
                            "submit",
                            row.id,
                            autoApprove
                              ? "Submitted & authorized"
                              : "Submitted for approval"
                          )
                        }
                      >
                        Submit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          void act("withdraw", row.id, "Withdrawn")
                        }
                      >
                        Withdraw
                      </Button>
                    </>
                  ) : null}
                  {row.status === "PENDING_APPROVAL" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void act("withdraw", row.id, "Withdrawn")}
                    >
                      Withdraw
                    </Button>
                  ) : null}
                  {["AUTHORIZED", "ACTIVE", "COMPLETED"].includes(
                    row.status
                  ) ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={async () => {
                        const ok = await copyProgramLink(
                          communityProgramLandingUrl(communityId, row.id)
                        );
                        if (ok) toast.success("Program link copied");
                        else toast.error("Could not copy link");
                      }}
                    >
                      Copy link
                    </Button>
                  ) : null}
                  {row.status === "AUTHORIZED" || row.status === "ACTIVE" ? (
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busy}
                      onClick={() =>
                        void act(
                          "revocation-request",
                          row.id,
                          "Revocation requested"
                        )
                      }
                    >
                      Request revocation
                    </Button>
                  ) : null}
                  {row.status === "REVOCATION_REQUESTED" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        void act(
                          "cancel-revocation",
                          row.id,
                          "Revocation request cancelled"
                        )
                      }
                    >
                      Cancel request
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
