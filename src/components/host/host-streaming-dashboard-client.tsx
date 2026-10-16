"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { getHostEventsAction } from "@/actions/events";
import { streamingPackCheckoutAction } from "@/actions/streaming-stripe";
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
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getHostEventsAction({ limit: 50 });
        const rows = unwrapPaginatedList<Event>(result.data);
        if (!cancelled) setEvents(rows);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "events_load_failed");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const startPackCheckout = useCallback(async () => {
    const hostId = hostSession.hostId;
    if (!hostId) {
      setPackMessage("Sign in as the host owner to purchase streaming credits.");
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
      const url = res.data?.url;
      if (!url) {
        setPackMessage("Checkout session created without a redirect URL.");
        return;
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
    if (params.get("checkout") === "success") {
      setPackMessage(
        "Pack checkout completed — credits apply after Stripe webhook delivery (usually seconds)."
      );
    } else if (params.get("checkout") === "cancel") {
      setPackMessage("Pack checkout cancelled.");
    }
  }, []);

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
        <h2 className="text-sm font-semibold">Streaming credits (Stripe test)</h2>
        <p className="text-muted-foreground text-xs">
          Pack checkout uses{" "}
          <code className="text-[11px]">STRIPE_PRICE_STREAMING_PACK_240</code> on
          the staging API. Subscription period grants use your existing Host
          Premium checkout.
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
