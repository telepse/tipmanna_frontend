"use client";

import { useCallback, useEffect, useState } from "react";

import {
  streamingHostWalletAction,
  type HostStreamingWalletSummary,
} from "@/actions/streaming-wallet";
import { useHostSession } from "@/hooks/use-host-session";

function fmtUnits(units: number, unitsPerCredit: number): string {
  const credits = units / unitsPerCredit;
  return `${credits.toLocaleString(undefined, {
    maximumFractionDigits: 1,
  })} credits (${units.toLocaleString()} units)`;
}

type Props = {
  /** Optional host id override; defaults to signed-in host session. */
  hostId?: string | null;
  compact?: boolean;
};

export function HostStreamingWalletPanel({ hostId, compact }: Props) {
  const hostSession = useHostSession();
  const resolvedHostId = hostId ?? hostSession.hostId;
  const [wallet, setWallet] = useState<HostStreamingWalletSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!resolvedHostId) {
      setWallet(null);
      setError("Sign in as the host owner to view streaming credits.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await streamingHostWalletAction({ hostId: resolvedHostId });
      if (!res.success || !res.data) {
        setError(res.error ?? "Unable to load streaming wallet.");
        setWallet(null);
        return;
      }
      setWallet(res.data);
    } finally {
      setLoading(false);
    }
  }, [resolvedHostId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!resolvedHostId && !hostSession.isActive) {
    return (
      <p className="text-muted-foreground text-xs">
        Sign in as the host owner to view the streaming credit wallet.
      </p>
    );
  }

  return (
    <section className="space-y-3 rounded-md border bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Streaming credit wallet</h2>
          <p className="text-muted-foreground mt-1 text-xs">
            Authoritative balances by source. Expired coverage is shown as
            unusable.
          </p>
        </div>
        <button
          type="button"
          className="rounded border px-2 py-1 text-xs disabled:opacity-50"
          disabled={loading}
          onClick={() => void refresh()}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error ? (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}

      {wallet ? (
        <>
          <div className="grid gap-2 text-xs sm:grid-cols-3">
            <div className="rounded border p-2">
              <p className="text-muted-foreground">Available</p>
              <p className="font-medium">
                {fmtUnits(
                  wallet.totals.availableUnits,
                  wallet.unitsPerCredit
                )}
              </p>
            </div>
            <div className="rounded border p-2">
              <p className="text-muted-foreground">Granted</p>
              <p className="font-medium">
                {fmtUnits(wallet.totals.grantedUnits, wallet.unitsPerCredit)}
              </p>
            </div>
            <div className="rounded border p-2">
              <p className="text-muted-foreground">Consumed</p>
              <p className="font-medium">
                {fmtUnits(wallet.totals.consumedUnits, wallet.unitsPerCredit)}
              </p>
            </div>
          </div>

          <p className="text-muted-foreground text-xs">
            {wallet.affordance.summary} {wallet.affordance.standardRate};{" "}
            {wallet.affordance.advancedRate}.
          </p>
          <p className="text-muted-foreground text-xs">{wallet.affordance.note}</p>

          {!compact ? (
            <>
              <div>
                <h3 className="mb-1 text-xs font-semibold">By source</h3>
                <ul className="space-y-1 text-xs">
                  {Object.entries(wallet.bySource).map(([kind, row]) =>
                    row.grantedUnits > 0 || row.availableUnits > 0 ? (
                      <li key={kind} className="flex justify-between gap-2">
                        <span className="text-muted-foreground">{kind}</span>
                        <span>
                          avail {row.availableUnits.toLocaleString()} · granted{" "}
                          {row.grantedUnits.toLocaleString()} · used{" "}
                          {row.consumedUnits.toLocaleString()}
                        </span>
                      </li>
                    ) : null
                  )}
                </ul>
              </div>

              <div>
                <h3 className="mb-1 text-xs font-semibold">Grant detail</h3>
                <ul className="divide-y rounded border text-xs">
                  {wallet.grants.length === 0 ? (
                    <li className="text-muted-foreground p-2">No grants yet.</li>
                  ) : (
                    wallet.grants.slice(0, 12).map(g => (
                      <li key={g.id} className="space-y-0.5 p-2">
                        <p className="font-medium">
                          {g.sourceLabel}
                          {g.expired ? " · expired" : ""}
                        </p>
                        <p className="text-muted-foreground">
                          Available {g.availableUnits.toLocaleString()} / granted{" "}
                          {g.grantedUnits.toLocaleString()} · coverage ends{" "}
                          {new Date(g.coverageEnd).toLocaleString()}
                        </p>
                      </li>
                    ))
                  )}
                </ul>
              </div>

              <div>
                <h3 className="mb-1 text-xs font-semibold">Pack purchase history</h3>
                <ul className="divide-y rounded border text-xs">
                  {wallet.packOrders.length === 0 ? (
                    <li className="text-muted-foreground p-2">
                      No pack checkout orders.
                    </li>
                  ) : (
                    wallet.packOrders.map(o => (
                      <li
                        key={o.packOrderId}
                        className="flex justify-between gap-2 p-2"
                      >
                        <span className="truncate font-mono text-[11px]">
                          {o.packOrderId}
                        </span>
                        <span>
                          {o.status}
                          {o.paidAt
                            ? ` · ${new Date(o.paidAt).toLocaleString()}`
                            : ""}
                        </span>
                      </li>
                    ))
                  )}
                </ul>
              </div>

              <div>
                <h3 className="mb-1 text-xs font-semibold">Recent usage / ledger</h3>
                <ul className="divide-y rounded border text-xs">
                  {wallet.recentLedger.length === 0 ? (
                    <li className="text-muted-foreground p-2">
                      No ledger entries yet.
                    </li>
                  ) : (
                    wallet.recentLedger.slice(0, 15).map(e => (
                      <li
                        key={e.id}
                        className="flex justify-between gap-2 p-2"
                      >
                        <span>
                          {e.entryKind} · {e.units.toLocaleString()} units
                        </span>
                        <span className="text-muted-foreground">
                          {new Date(e.createdAt).toLocaleString()}
                        </span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
