"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getHostEventsAction } from "@/actions/events";
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
  const [events, setEvents] = useState<Event[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
