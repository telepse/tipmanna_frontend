"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { searchEventsByCodeAction } from "@/actions/events";

type EventRow = {
  id: string;
  eventName?: string;
  approved?: boolean;
};

export function WatchEventCodePicker() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);

  const submitCode = async () => {
    const trimmed = code.trim();
    if (!trimmed) {
      setError("Enter your host event code.");
      return;
    }
    setLoading(true);
    setError(null);
    setEvents([]);
    try {
      const res = await searchEventsByCodeAction(trimmed);
      if (!res.success || !res.data) {
        setError(res.error ?? "No events found for that code.");
        return;
      }
      const list = (Array.isArray(res.data) ? res.data : []) as EventRow[];
      const approved = list.filter(row => row.id && row.approved !== false);
      if (!approved.length) {
        setError("No approved event rooms found for this code.");
        return;
      }
      setEvents(approved);
    } catch {
      setError("Could not look up event code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-[3vmin] p-[4vmin]">
      <h1 className="text-[3.5vmin] font-bold">Screen Display</h1>
      <p className="max-w-xl text-center text-[2vmin] text-white/70">
        Enter the host event code, then choose the event room to show on your
        TV.
      </p>
      <div className="flex w-full max-w-md flex-col gap-3">
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="Event code"
          value={code}
          onChange={e => setCode(e.target.value)}
          className="rounded-lg border border-white/30 bg-black px-4 py-4 text-[2.5vmin] text-white"
        />
        <button
          type="button"
          disabled={loading}
          onClick={() => void submitCode()}
          className="watch-tile rounded-lg bg-white py-4 font-semibold text-black disabled:opacity-50"
        >
          {loading ? "Looking up…" : "Find events"}
        </button>
        {error ? (
          <p className="text-center text-[2vmin] text-red-300">{error}</p>
        ) : null}
      </div>
      {events.length > 0 ? (
        <ul className="mt-4 flex w-full max-w-lg flex-col gap-3">
          {events.map(ev => (
            <li key={ev.id}>
              <button
                type="button"
                className="watch-tile w-full rounded-xl bg-white/10 px-6 py-4 text-left hover:bg-white/20"
                onClick={() => router.push(`/watch/screen/${ev.id}`)}
              >
                <span className="text-[2.5vmin] font-semibold">
                  {ev.eventName ?? "Event room"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <Link
        href="/watch"
        className="text-[2vmin] text-white/60 underline"
      >
        Back to hub
      </Link>
    </div>
  );
}
