"use client";

import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getHostCoOwnedVideosAction,
  markCoOwnerPaidAction,
  shareCoOwnerReportAction,
} from "@/actions/coowner-host";
import { Loader2 } from "lucide-react";
import type { RootState } from "@/redux/store";
import { extractYoutubeID } from "@/lib/extractYoutubeID";

type CoOwnerRow = {
  id: string;
  coOwnerName: string;
  coOwnerEmail: string;
  payoutPercentBp: number;
  owedTotalPence: number;
  paidSumPence: number;
  outstandingPence: number;
  redFlag: boolean;
};

type DashboardVideo = {
  id: string;
  title: string;
  eventName: string;
  coOwnerApproved: boolean;
  ownershipState?: string | null;
  coOwnerInviteStatus?: "awaiting" | "approved" | "expired" | null;
  tipsGbp: number;
  coOwners: CoOwnerRow[];
  url: string;
};

function formatMoneyFromPence(p: number) {
  return `£${(p / 100).toFixed(2)}`;
}

async function postMarkCoOwnerPaid(
  eventChannelId: string,
  videoCoOwnerId: string,
  paidPence: number,
  notes: string,
  receipt: File
) {
  const fd = new FormData();
  fd.append("paidPence", String(paidPence));
  if (notes.trim()) fd.append("notes", notes.trim());
  fd.append("receipt", receipt);
  const res = await markCoOwnerPaidAction(eventChannelId, videoCoOwnerId, fd);
  if (!res.success) {
    throw new Error(res.error ?? "Request failed");
  }
}

export function HostVideoCoOwnersClient() {
  const userId = useSelector((s: RootState) => s.auth.user?.id);
  const authToken = useSelector((s: RootState) => s.auth.token);
  const [videos, setVideos] = useState<DashboardVideo[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    const res = await getHostCoOwnedVideosAction();
    if (!res.success || res.data == null) {
      toast.error(res.message ?? res.error ?? "Could not load co-owner data");
      setVideos([]);
      setLoading(false);
      return;
    }
    const data = res.data as { videos?: DashboardVideo[] };
    setVideos(Array.isArray(data.videos) ? data.videos : []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 p-6 text-sm">
        <Loader2 className="size-4 animate-spin" />
        Loading co-owner overview…
      </div>
    );
  }

  return (
    <div className="bg-card space-y-4 rounded p-4 p-6 sm:p-6">
      <div className="space-y-2">
        <h3 className="text-xl font-semibold sm:text-2xl">Video co-owners</h3>
        <p className="text-muted-foreground text-sm">
          Track revenue owed to co-owners, upload payment receipts, and email
          payout summaries.
        </p>
      </div>

      {videos.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No co-owned videos yet. Submit co-owned uploads from your event or
          community flows; they appear here while awaiting or after co-owner
          approval.
        </p>
      ) : (
        <div className="space-y-6">
          {videos.map(v => (
            <section
              key={v.id}
              className="rounded-md border bg-white p-3 sm:p-4"
            >
              {/* Main video content */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                {/* Thumbnail + video information */}
                <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  {/* Video thumbnail */}
                  <div className="w-full shrink-0 overflow-hidden rounded-md sm:w-28">
                    <img
                      src={(() => {
                        const videoId = extractYoutubeID(v.url);

                        return videoId
                          ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
                          : "/default-event-image.jpg";
                      })()}
                      alt={v.title}
                      className="aspect-video h-auto w-full object-cover sm:aspect-auto sm:h-14"
                    />
                  </div>

                  {/* Video information */}
                  <div className="min-w-0 space-y-1">
                    <h5 className="truncate font-semibold">{v.title}</h5>

                    <p className="text-muted-foreground flex items-center gap-2 text-xs">
                      <span className="bg-primary size-2 shrink-0 rounded-full" />{" "}
                      Channel: {v.eventName}
                    </p>

                    <p className="text-muted-foreground text-xs">
                      {v.coOwnerInviteStatus === "awaiting"
                        ? "Awaiting co-owner email approval — hidden from public play"
                        : v.coOwnerInviteStatus === "expired"
                          ? "Co-owner invite expired — hidden from public play until resend and approve"
                          : v.coOwnerInviteStatus === "approved"
                            ? `${v.coOwners.length} co-owner${
                                v.coOwners.length === 1 ? "" : "s"
                              } on file`
                            : v.coOwners.length === 0
                              ? "No co-owner payout rows yet"
                              : `${v.coOwners.length} co-owner${
                                  v.coOwners.length === 1 ? "" : "s"
                                } on file`}
                    </p>
                  </div>
                </div>

                {/* Tips gross + co-owner file */}
                <div className="flex w-full shrink-0 gap-2 sm:w-auto sm:justify-end">
                  <div className="bg-muted/50 flex-1 rounded-md px-3 py-2 sm:flex-none">
                    <p className="text-muted-foreground text-xs">Tips Gross</p>

                    <p className="text-primary font-semibold">
                      £{Number(v.tipsGbp ?? 0).toFixed(2)}
                    </p>
                  </div>

                  <div className="bg-muted/50 flex-1 rounded-md px-3 py-2 sm:flex-none">
                    <p className="text-muted-foreground text-xs">
                      Co-owner File
                    </p>

                    <p
                      className={`font-semibold ${
                        v.coOwnerApproved
                          ? "text-green-600"
                          : "text-muted-foreground"
                      }`}
                    >
                      {v.coOwnerApproved ? "Yes" : "No"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Co-owner payout details */}
              {v.coOwners.length === 0 ? (
                <div className="bg-muted/40 mt-4 rounded-md px-3 py-3">
                  <p className="text-muted-foreground text-sm">
                    No co-owner payout rows for this video yet.
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {v.coOwners.map(co => (
                    <div
                      key={co.id}
                      className="rounded-lg border border-dashed p-3"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        {/* Co-owner information */}
                        <div className="min-w-0">
                          <p className="font-medium">{co.coOwnerName}</p>

                          <p className="text-muted-foreground truncate text-xs">
                            {co.coOwnerEmail}
                          </p>

                          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                            Share: {(co.payoutPercentBp / 100).toFixed(2)}%
                            {" · "}
                            Owed total {formatMoneyFromPence(co.owedTotalPence)}
                            {" · "}
                            Paid {formatMoneyFromPence(co.paidSumPence)}
                            {" · "}
                            <span
                              className={
                                co.outstandingPence > 0
                                  ? "font-semibold text-amber-800"
                                  : ""
                              }
                            >
                              Outstanding{" "}
                              {formatMoneyFromPence(co.outstandingPence)}
                            </span>
                          </p>
                        </div>

                        {/* Email payout link */}
                        <div className="flex shrink-0">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="w-full sm:w-auto"
                            onClick={async () => {
                              if (!userId) {
                                toast.error("Sign in required");
                                return;
                              }

                              const r = await shareCoOwnerReportAction(
                                v.id,
                                co.coOwnerEmail
                              );

                              if (!r.success) {
                                toast.error(
                                  r.message ?? r.error ?? "Could not send email"
                                );
                                return;
                              }

                              toast.success("Report link emailed to co-owner");
                            }}
                          >
                            Email payout link
                          </Button>
                        </div>
                      </div>

                      {/* Mark paid */}
                      {co.outstandingPence > 0 ? (
                        <div className="mt-3 border-t pt-3">
                          <MarkPaidMiniForm
                            authToken={authToken}
                            eventChannelId={v.id}
                            videoCoOwnerId={co.id}
                            maxPence={co.outstandingPence}
                            onDone={() => void load()}
                          />
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function MarkPaidMiniForm({
  authToken,
  eventChannelId,
  videoCoOwnerId,
  maxPence,
  onDone,
}: {
  authToken: string | null;
  eventChannelId: string;
  videoCoOwnerId: string;
  maxPence: number;
  onDone: () => void;
}) {
  const [gbp, setGbp] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="mt-3 space-y-2 border-t pt-3">
      <p className="text-xs font-medium">Record a payment</p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Amount (£)</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            className="h-9 w-32"
            value={gbp}
            onChange={e => setGbp(e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Receipt file</Label>
          <Input
            type="file"
            accept="image/*,application/pdf"
            className="h-9 max-w-[200px] text-xs"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <div className="min-w-[160px] flex-1 space-y-1">
          <Label className="text-xs">Notes (optional)</Label>
          <Input
            className="h-9"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={async () => {
            if (!authToken) {
              toast.error("Sign in required");
              return;
            }
            const n = Number(gbp);
            if (!Number.isFinite(n) || n <= 0) {
              toast.error("Enter a valid amount in £");
              return;
            }
            const paidPence = Math.round(n * 100);
            if (paidPence > maxPence) {
              toast.error(
                `Amount cannot exceed outstanding (${formatMoneyFromPence(maxPence)})`
              );
              return;
            }
            if (!file) {
              toast.error("Receipt file required");
              return;
            }
            setBusy(true);
            try {
              await postMarkCoOwnerPaid(
                eventChannelId,
                videoCoOwnerId,
                paidPence,
                notes,
                file
              );
              toast.success("Payment recorded");
              setGbp("");
              setNotes("");
              setFile(null);
              onDone();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Failed to save");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Saving…" : "Mark paid"}
        </Button>
      </div>
      <p className="text-muted-foreground text-[10px]">
        Max this entry: {formatMoneyFromPence(maxPence)}
      </p>
    </div>
  );
}
