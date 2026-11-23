"use client";

import { useEffect, useRef } from "react";

import { getEventChannels } from "@/actions/events";
import type { EventRoomVideoChannel } from "@/types/event-room-channel.types";

function normalizeChannelRows(data: unknown): EventRoomVideoChannel[] {
  if (!Array.isArray(data)) return [];
  return data
    .filter(
      (row): row is Record<string, unknown> =>
        Boolean(row) && typeof row === "object" && !("restricted" in row)
    )
    .map(row => ({
      id: String(row.id),
      url: String(row.url ?? ""),
      title: typeof row.title === "string" ? row.title : undefined,
      isDefault: row.isDefault === true,
      durationSeconds:
        typeof row.durationSeconds === "number"
          ? row.durationSeconds
          : undefined,
      mediaSource:
        row.mediaSource === "native" || row.mediaSource === "linked"
          ? row.mediaSource
          : undefined,
    }));
}

function isDocumentVisible(): boolean {
  return (
    typeof document === "undefined" || document.visibilityState === "visible"
  );
}

/** LIVE-010 / D33: refresh channel URLs when Pusher is missed (15s idle poll). */
export function useEventRoomChannelsPoll(
  eventId: string | undefined,
  onChannels: (channels: EventRoomVideoChannel[]) => void,
  intervalMs = 15_000
) {
  const onChannelsRef = useRef(onChannels);
  onChannelsRef.current = onChannels;

  useEffect(() => {
    if (!eventId?.trim()) return;

    const trimmedEventId = eventId.trim();
    let cancelled = false;
    let inFlight = false;

    const refresh = async () => {
      if (cancelled || inFlight) return;
      inFlight = true;
      try {
        const res = await getEventChannels(trimmedEventId);
        if (cancelled || !res.success || !res.data) return;
        const rows = normalizeChannelRows(res.data);
        if (rows.length > 0) {
          onChannelsRef.current(rows);
        }
      } finally {
        inFlight = false;
      }
    };

    const tick = () => {
      if (!isDocumentVisible()) return;
      void refresh();
    };

    const id = window.setInterval(tick, intervalMs);

    const onVisibilityChange = () => {
      if (!isDocumentVisible()) return;
      // Prompt refresh on return-to-visible; single-flight skips if already in flight.
      void refresh();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [eventId, intervalMs]);
}
