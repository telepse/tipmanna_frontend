"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { getHostEventsAction } from "@/actions/events";
import {
  streamingPackCheckoutAction,
  streamingPackOrderStatusAction,
} from "@/actions/streaming-stripe";
import { useHostSession } from "@/hooks/use-host-session";
import { unwrapPaginatedList } from "@/lib/unwrap-paginated-list";
import type { Event } from "@/types";

type Props = {
  hostSlug: string;
};

/**
 * LIVE-010 — owner dashboard entry for explicit native broadcast management (D35).
 * Does not auto-join Daily; opens per-event broadcast console.
 */
export function HostStreamingDashboardClient({ hostSlug }: Props) {
  const hostSession = useHostSession();
  const [events, setEvents] = useState<Event[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [packBusy, setPackBusy] = useState(false);
  const [packMessage, setPackMessage] = useState<string | null>(null);

  useEffect(() => {
    const cancelLoad = { value: false };
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getHostEventsAction({ limit: 50 });
        const rows = unwrapPaginatedList<Event>(result.data);
        if (!cancelLoad.value) setEvents(rows);
      } catch (e) {
        if (!cancelLoad.value) {
          setError(e instanceof Error ? e.message : "events_load_failed");
        }
      } finally {
        if (!cancelLoad.value) setLoading(false);
      }
    })();
    return () => {
      cancelLoad.value = true;
    };
  }, []);

  const startPackCheckout = useCallback(async () => {
    const hostId = hostSession.hostId;
    if (!hostId) {
      setPackMessage(
        "Sign in as the host owner to purchase streaming credits."
      );
      return;
    }
    setPackBusy(true);
    setPackMessage(null);
    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const returnPath = `/host/${hostSlug}/streaming?pack=return`;
      const res = await streamingPackCheckoutAction({
        hostId,
        successUrl: `${origin}${returnPath}&checkout=success`,
        cancelUrl: `${origin}${returnPath}&checkout=cancel`,
      });
      if (!res.success) {
        setPackMessage(res.error ?? "Unable to start pack checkout.");
        return;
      }
      const packOrderId = res.data?.packOrderId;
      const url = res.data?.url;
      if (!url || !packOrderId) {
        setPackMessage("Checkout session created without a redirect URL.");
        return;
      }
      try {
        sessionStorage.setItem("streaming_pack_return_order", packOrderId);
      } catch {
        /* ignore */
      }
      window.location.href = url;
    } finally {
      setPackBusy(false);
    }
  }, [hostSession.hostId, hostSlug]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("pack") !== "return") return;

    if (params.get("checkout") === "cancel") {
      setPackMessage("Pack checkout cancelled.");
      return;
    }

    if (params.get("checkout") !== "success") return;

    const hostId = hostSession.hostId;
    const packOrderId =
      params.get("packOrderId")?.trim() ||
      (() => {
        try {
          return sessionStorage.getItem("streaming_pack_return_order")?.trim();
        } catch {
          return undefined;
        }
      })();

    if (!hostId || !packOrderId) {
      setPackMessage(
        "Checkout returned — sign in as the host owner to confirm pack fulfilment status."
      );
      return;
    }

    const cancelPoll = { value: false };
    let attempts = 0;

    const poll = async () => {
      attempts += 1;
      const statusRes = await streamingPackOrderStatusAction({
        hostId,
        packOrderId,
      });
      if (cancelPoll.value) return;

      if (!statusRes.success || !statusRes.data) {
        setPackMessage(
          statusRes.error ??
            "Could not load pack status — reload this page after signing in."
        );
        return;
      }

      const data = statusRes.data;
      if (data.fulfilmentConfirmed) {
        setPackMessage(
          `Pack fulfilment confirmed on server — ${data.grantUnitsAwarded ?? "14400"} units awarded.`
        );
        return;
      }

      if (data.status === "failed") {
        setPackMessage("Pack checkout failed — no credits were granted.");
        return;
      }

      if (data.paymentProcessing || data.status === "pending") {
        if (attempts < 12) {
          setPackMessage(
            "Payment received — waiting for Stripe webhook fulfilment (usually seconds)…"
          );
          window.setTimeout(() => void poll(), 2500);
          return;
        }
        setPackMessage(
          "Payment still processing — check superadmin wallet-summary or retry shortly."
        );
        return;
      }

      if (data.status === "paid" && !data.fulfilmentConfirmed) {
        setPackMessage(
          "Order marked paid — ledger grant not confirmed yet; check wallet-summary."
        );
      }
    };

    void poll();
    return () => {
      cancelPoll.value = true;
    };
  }, [hostSession.hostId]);

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <div>
        <h1 className="text-xl font-semibold">Native streaming</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Owner-only. Choose an event to open the broadcast console. Go live is
          explicit — this page does not start provider billing or join Daily
          automatically.
        </p>
      </div>

      <section className="space-y-2 rounded-md border bg-white p-4">
        <h2 className="text-sm font-semibold">
          Streaming credits (Stripe test)
        </h2>
        <p className="text-muted-foreground text-xs">
          Pack checkout uses{" "}
          <code className="text-[11px]">STRIPE_PRICE_STREAMING_PACK_240</code>{" "}
          on the staging API. After payment, open a broadcast console and use{" "}
          <strong>Activate credits</strong> for the one-time pack activation
          bonus (not Host Premium — that path is for subscribers only).
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded border px-2 py-1 text-xs disabled:opacity-50"
            disabled={packBusy || !hostSession.isActive}
            onClick={() => void startPackCheckout()}
          >
            {packBusy ? "Opening checkout…" : "Buy 240-credit pack (£10 test)"}
          </button>
          <Link
            className="rounded border px-2 py-1 text-xs hover:bg-gray-50"
            href={`/host/${hostSlug}/host-premium`}
          >
            Host Premium subscription (invoice.paid path)
          </Link>
        </div>
        {packMessage ? (
          <p className="text-muted-foreground text-xs">{packMessage}</p>
        ) : null}
      </section>

      {loading ? <p className="text-sm">Loading events…</p> : null}
      {error ? (
        <p
          className="text-destructive text-sm"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {!loading && !error ? (
        <ul className="divide-y rounded-md border bg-white">
          {events.length === 0 ? (
            <li className="text-muted-foreground p-4 text-sm">
              No events found.
            </li>
          ) : (
            events.map(ev => (
              <li
                key={ev.id}
                className="flex items-center justify-between gap-2 p-3"
              >
                <div>
                  <p className="text-sm font-medium">{ev.eventName ?? ev.id}</p>
                  {ev.eventDate ? (
                    <p className="text-muted-foreground text-xs">
                      {ev.eventDate}
                    </p>
                  ) : null}
                </div>
                <Link
                  className="rounded border px-2 py-1 text-xs hover:bg-gray-50"
                  href={`/host/${hostSlug}/broadcast/${ev.id}`}
                >
                  Broadcast console
                </Link>
              </li>
            ))
          )}
        </ul>
      ) : null}

      <p className="text-muted-foreground text-xs">
        Cohosts manage broadcasts from the event room only. Public native starts
        remain gated by platform ops until Finish A experiments pass.
      </p>
    </div>
  );
}
