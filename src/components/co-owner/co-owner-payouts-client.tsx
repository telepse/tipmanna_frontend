"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import {
  getSelfCoOwnerPayoutsAction,
  postSelfCoOwnerDisputeAction,
} from "@/actions/coowner-self";

const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_URL;

type DisputeRow = {
  id: string;
  reason: string;
  status: string;
  kind?: string;
};

type PayoutRow = {
  id: string;
  periodStart: string;
  periodEnd: string;
  owedPence: number;
  paidPence: number;
  receiptUrl: string | null;
  disputes: DisputeRow[];
};

type Item = {
  videoCoOwnerId: string;
  eventChannelId: string;
  videoTitle: string;
  eventName: string;
  hostName: string;
  payoutPercentBp: number;
  owedTotalPence: number;
  paidSumPence: number;
  outstandingPence: number;
  redFlag: boolean;
  payouts: PayoutRow[];
  videoDisputes?: DisputeRow[];
};

type DisputeTarget =
  | { kind: "payout_false"; payoutId: string }
  | { kind: "unpaid_outstanding"; videoCoOwnerId: string };

type Props =
  | {
      mode: "token";
      token: string;
      compact?: boolean;
      showPendingTotal?: boolean;
    }
  | { mode: "hostSession"; compact?: boolean; showPendingTotal?: boolean };

export function CoOwnerPayoutsClient(props: Props) {
  const compact = props.compact ?? false;
  const showPendingTotal = props.showPendingTotal ?? false;
  const mode = props.mode;
  const token = props.mode === "token" ? props.token : "";
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [disputeTarget, setDisputeTarget] = useState<DisputeTarget | null>(
    null
  );
  const [disputeReason, setDisputeReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (mode === "hostSession") {
        const res = await getSelfCoOwnerPayoutsAction();
        if (!res.success) {
          setError(res.error ?? "Could not load payouts");
          setItems([]);
          return;
        }
        const list = (res.data as { items?: Item[] } | null)?.items;
        setItems(Array.isArray(list) ? list : []);
        return;
      }

      const res = await fetch(
        `${apiBase}/public/co-owner/payouts?token=${encodeURIComponent(token)}`
      );
      const raw = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof raw === "object" && raw !== null && "message" in raw
            ? String((raw as { message?: string }).message)
            : "Invalid or expired link"
        );
        setItems([]);
        return;
      }
      const list = (raw as { items?: Item[] }).items;
      setItems(Array.isArray(list) ? list : []);
    } catch {
      setError("Could not load payouts");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [mode, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDispute = async () => {
    if (!disputeTarget || !disputeReason.trim()) return;
    setBusy(true);
    setError(null);
    try {
      if (props.mode === "hostSession") {
        const res = await postSelfCoOwnerDisputeAction({
          ...(disputeTarget.kind === "payout_false"
            ? { payoutId: disputeTarget.payoutId }
            : { videoCoOwnerId: disputeTarget.videoCoOwnerId }),
          kind: disputeTarget.kind,
          reason: disputeReason.trim(),
        });
        if (!res.success) {
          setError(res.error ?? "Could not open dispute");
          return;
        }
      } else {
        const res = await fetch(
          `${apiBase}/public/co-owner/payouts/dispute?token=${encodeURIComponent(props.token)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...(disputeTarget.kind === "payout_false"
                ? { payoutId: disputeTarget.payoutId }
                : { videoCoOwnerId: disputeTarget.videoCoOwnerId }),
              kind: disputeTarget.kind,
              reason: disputeReason.trim(),
            }),
          }
        );
        const raw = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(
            typeof raw === "object" && raw !== null && "message" in raw
              ? String((raw as { message?: string }).message)
              : "Could not open dispute"
          );
          return;
        }
      }
      setDisputeTarget(null);
      setDisputeReason("");
      await load();
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div
        className={
          compact
            ? "text-muted-foreground flex items-center gap-2 py-6"
            : "text-muted-foreground flex min-h-[40vh] items-center justify-center gap-2"
        }
      >
        <Loader2 className="size-5 animate-spin" />
        Loading payout history…
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div className={compact ? "" : "mx-auto max-w-lg p-6"}>
        <p className="text-destructive text-sm">{error}</p>
      </div>
    );
  }

  const totalOutstandingPence = items.reduce(
    (sum, it) => sum + (it.outstandingPence ?? 0),
    0
  );

  return (
    <div className={compact ? "space-y-6" : "mx-auto max-w-3xl space-y-8 p-6"}>
      {!compact ? (
        <header>
          <h1 className="text-2xl font-semibold">Your co-owner payouts</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Amounts are derived from platform records. Dispute a recorded payout
            or report unpaid outstanding balance.
          </p>
        </header>
      ) : null}

      {showPendingTotal && items.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
          <p className="font-medium text-amber-950">Total pending payout</p>
          <p className="text-amber-900">
            {totalOutstandingPence > 0 ? (
              <>
                £{(totalOutstandingPence / 100).toFixed(2)} outstanding across{" "}
                {items.filter(it => it.outstandingPence > 0).length} video
                {items.filter(it => it.outstandingPence > 0).length === 1
                  ? ""
                  : "s"}
              </>
            ) : (
              <>
                No outstanding balance across {items.length} co-owner video
                {items.length === 1 ? "" : "s"}
              </>
            )}
          </p>
        </div>
      ) : null}

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No co-owner videos linked to your account email.
        </p>
      ) : (
        items.map(it => (
          <section
            key={it.videoCoOwnerId}
            className="rounded-xl border bg-white p-4 shadow-sm"
          >
            <h2 className="text-lg font-medium">{it.videoTitle}</h2>
            <p className="text-muted-foreground text-xs">
              {it.eventName} · Host: {it.hostName}
            </p>
            <p className="mt-2 text-sm">
              Share {(it.payoutPercentBp / 100).toFixed(2)}% · Owed total £
              {(it.owedTotalPence / 100).toFixed(2)} · Paid £
              {(it.paidSumPence / 100).toFixed(2)} · Outstanding £
              <span
                className={
                  it.outstandingPence > 0 ? "font-semibold text-amber-800" : ""
                }
              >
                {(it.outstandingPence / 100).toFixed(2)}
              </span>
            </p>

            {it.outstandingPence > 0 &&
            !(it.videoDisputes?.some(d => d.status === "open") ?? false) ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() =>
                  setDisputeTarget({
                    kind: "unpaid_outstanding",
                    videoCoOwnerId: it.videoCoOwnerId,
                  })
                }
              >
                Dispute unpaid outstanding
              </Button>
            ) : it.videoDisputes?.length ? (
              <p className="text-muted-foreground mt-2 text-xs">
                Outstanding dispute:{" "}
                {it.videoDisputes.map(d => d.reason).join("; ")}
              </p>
            ) : null}

            <div className="mt-4 space-y-3">
              <h3 className="text-sm font-medium">Payments recorded</h3>
              {it.payouts.length === 0 ? (
                <p className="text-muted-foreground text-xs">None yet.</p>
              ) : (
                <ul className="space-y-3">
                  {it.payouts.map(p => (
                    <li
                      key={p.id}
                      className="rounded-md border p-3 text-xs"
                    >
                      <div className="flex flex-wrap justify-between gap-2">
                        <span>
                          {new Date(p.periodStart).toLocaleDateString()} –{" "}
                          {new Date(p.periodEnd).toLocaleDateString()}
                        </span>
                        <span className="font-medium">
                          Paid £{(p.paidPence / 100).toFixed(2)}
                        </span>
                      </div>
                      {p.receiptUrl ? (
                        <a
                          href={p.receiptUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary mt-1 inline-block underline"
                        >
                          View receipt
                        </a>
                      ) : null}
                      {p.disputes?.length ? (
                        <p className="text-muted-foreground mt-2">
                          Dispute: {p.disputes.map(d => d.reason).join("; ")}
                        </p>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() =>
                            setDisputeTarget({
                              kind: "payout_false",
                              payoutId: p.id,
                            })
                          }
                        >
                          Dispute this payout
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        ))
      )}

      {disputeTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-lg">
            <h3 className="font-semibold">Open a dispute</h3>
            <p className="text-muted-foreground mt-1 text-xs">
              {disputeTarget.kind === "unpaid_outstanding"
                ? "Report unpaid outstanding balance. Our team will review with the host and logs."
                : "Describe the issue with this payout. Our team will review alongside the host and logs."}
            </p>
            <div className="mt-3 space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Input
                id="reason"
                value={disputeReason}
                onChange={e => setDisputeReason(e.target.value)}
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setDisputeTarget(null);
                  setDisputeReason("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={busy || !disputeReason.trim()}
                onClick={() => void openDispute()}
              >
                {busy ? "Sending…" : "Submit"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
