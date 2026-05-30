"use client";

import { useEffect } from "react";
import { useStoredEvent } from "@/hooks/use-store-event";

export default function StoreEventBridge({
  eventId,
  eventName,
}: {
  eventId: string;
  eventName?: string;
}) {
  const storeEvent = useStoredEvent(state => state.storeEvent);

  useEffect(() => {
    if (eventId) {
      storeEvent({ id: eventId, name: eventName });
      localStorage.setItem("lastEventId", eventId); // fallback for non-hydrated Zustand
    }
  }, [eventId, eventName, storeEvent]);

  return null;
}
