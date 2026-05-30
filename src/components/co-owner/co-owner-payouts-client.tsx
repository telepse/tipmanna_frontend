"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_URL;

type PayoutRow = {
  id: string;
  periodStart: string;
  periodEnd: string;
  owedPence: number;
  paidPence: number;
  receiptUrl: string | null;
  disputes: { id: string; reason: string; status: string }[];
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
};

export function CoOwnerPayoutsClient({ token }: { token: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [disputePayoutId, setDisputePayoutId] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
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
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDispute = async () => {
    if (!disputePayoutId || !disputeReason.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `${apiBase}/public/co-owner/payouts/dispute?token=${encodeURIComponent(token)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            payoutId: disputePayoutId,
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
      setDisputePayoutId(null);
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
      <div className="text-muted-foreground flex min-h-[40vh] items-center justify-center gap-2">
        <Loader2 className="size-5 animate-spin" />
        Loading payout history…
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <p className="text-destructive text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Your co-owner payouts</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Amounts are derived from platform records. Open a dispute on a payout
          if something looks wrong.
        </p>
      </header>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No payout rows for this link.
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
                          onClick={() => setDisputePayoutId(p.id)}
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

      {disputePayoutId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-lg">
            <h3 className="font-semibold">Open a dispute</h3>
            <p className="text-muted-foreground mt-1 text-xs">
              Describe the issue. Our team will review alongside the host and
              logs.
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
                  setDisputePayoutId(null);
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
