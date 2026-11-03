"use client";

import { useCallback, useRef } from "react";

import { appendPublisherClientDiagnosticsAction } from "@/actions/event-broadcast";
import type { EventBroadcastActionOptions } from "@/actions/event-broadcast";
import type { PublisherClientDiagnosticEntry } from "@/lib/native-publisher-client-diagnostics";

const MAX_BUFFER = 32;

export function usePublisherClientDiagnostics(
  eventId: string | undefined,
  broadcastId: string | undefined,
  authOptions: EventBroadcastActionOptions
) {
  const bufferRef = useRef<PublisherClientDiagnosticEntry[]>([]);

  const push = useCallback((entry: PublisherClientDiagnosticEntry) => {
    bufferRef.current = [...bufferRef.current, entry].slice(-MAX_BUFFER);
  }, []);

  const flush = useCallback(async () => {
    if (!eventId || !broadcastId || bufferRef.current.length === 0) {
      return;
    }
    const entries = bufferRef.current;
    bufferRef.current = [];
    await appendPublisherClientDiagnosticsAction(
      eventId,
      broadcastId,
      entries,
      authOptions
    );
  }, [eventId, broadcastId, authOptions]);

  return { push, flush };
}
