"use client";

import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getHostCoOwnedVideosAction,
  shareCoOwnerReportAction,
} from "@/actions/coowner-host";
import { Loader2 } from "lucide-react";
import type { RootState } from "@/redux/store";

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
  tipsGbp: number;
  coOwners: CoOwnerRow[];
};

function formatMoneyFromPence(p: number) {
  return `£${(p / 100).toFixed(2)}`;
}

async function postMarkCoOwnerPaid(
  authToken: string,
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
  const base = process.env.NEXT_PUBLIC_BACKEND_API_URL;
  const res = await fetch(
    `${base}/host/me/co-owned-videos/${encodeURIComponent(eventChannelId)}/co-owners/${encodeURIComponent(videoCoOwnerId)}/mark-paid`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
      body: fd,
    }
  );
  const raw = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      raw && typeof raw === "object" && raw !== null && "message" in raw
        ? String((raw as { message?: string }).message)
        : `Request failed (${res.status})`;
    throw new Error(msg);
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
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Video co-owners
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Track revenue owed to co-owners, upload payment receipts, and email
          payout summaries.
        </p>
      </header>

      {videos.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No event videos yet. Add videos from your event or community flows;
          videos with approved co-owner invites appear here.
        </p>
      ) : (
        <div className="space-y-8">
          {videos.map(v => (
            <section
              key={v.id}
              className="rounded-xl border bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h2 className="text-lg font-medium">{v.title}</h2>
                  <p className="text-muted-foreground text-xs">{v.eventName}</p>
                </div>
                <div className="text-muted-foreground text-right text-xs">
                  <div>Tips (gross): £{Number(v.tipsGbp ?? 0).toFixed(2)}</div>
                  <div>
                    Co-owner on file: {v.coOwnerApproved ? "Yes" : "No"}
                  </div>
                </div>
              </div>

              {v.coOwners.length === 0 ? (
                <p className="text-muted-foreground mt-3 text-sm">
                  No co-owner payout rows for this video yet.
                </p>
              ) : (
                <ul className="mt-4 space-y-6">
                  {v.coOwners.map(co => (
                    <li
                      key={co.id}
                      className="rounded-lg border border-dashed p-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{co.coOwnerName}</p>
                          <p className="text-muted-foreground text-xs">
                            {co.coOwnerEmail}
                          </p>
                          <p className="text-muted-foreground mt-1 text-xs">
                            Share: {(co.payoutPercentBp / 100).toFixed(2)}% ·
                            Owed total {formatMoneyFromPence(co.owedTotalPence)}{" "}
                            · Paid {formatMoneyFromPence(co.paidSumPence)} ·
                            <span
                              className={
                                co.outstandingPence > 0
                                  ? "font-semibold text-amber-800"
                                  : ""
                              }
                            >
                              {" "}
                              Outstanding{" "}
                              {formatMoneyFromPence(co.outstandingPence)}
                            </span>
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
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

                      {co.outstandingPence > 0 ? (
                        <MarkPaidMiniForm
                          authToken={authToken}
                          eventChannelId={v.id}
                          videoCoOwnerId={co.id}
                          maxPence={co.outstandingPence}
                          onDone={() => void load()}
                        />
                      ) : null}
                    </li>
                  ))}
                </ul>
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
                authToken,
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
