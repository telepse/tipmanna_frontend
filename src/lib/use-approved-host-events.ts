"use client";

import { useCallback, useEffect, useState } from "react";

import { getHostEventsAction } from "@/actions/events";
import type { HostEventRoomOption } from "@/components/dashboard/host-event-room-picker-dialog";
import { parseApprovedHostEventsForPicker } from "@/lib/parse-host-events";

export function useApprovedHostEvents(open: boolean) {
  const [events, setEvents] = useState<HostEventRoomOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getHostEventsAction({ limit: 100 });
      if (!res.success || !res.data) {
        setError(res.message ?? "Could not load events.");
        setEvents([]);
        return;
      }
      setEvents(parseApprovedHostEventsForPicker(res.data));
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      setHasLoaded(false);
      return;
    }
    void load();
  }, [load, open]);

  const effectiveLoading = open && (!hasLoaded || loading);

  return { events, loading: effectiveLoading, error, reload: load };
}
