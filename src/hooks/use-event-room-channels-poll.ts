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

    let cancelled = false;

    const refresh = async () => {
      const res = await getEventChannels(eventId.trim());
      if (cancelled || !res.success || !res.data) return;
      const rows = normalizeChannelRows(res.data);
      if (rows.length > 0) {
        onChannelsRef.current(rows);
      }
    };

    const id = window.setInterval(() => {
      void refresh();
    }, intervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [eventId, intervalMs]);
}
