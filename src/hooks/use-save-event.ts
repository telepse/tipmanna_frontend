"use client";

import { useEffect } from "react";

type EventData = {
  id: string;
  eventName: string;
  eventType: string;
};

export function useSaveEvent(event: EventData | null) {
  useEffect(() => {
    if (!event) return;
    try {
      localStorage.setItem("event-info", JSON.stringify(event));
    } catch (error) {
      console.error("Failed to save event info:", error);
    }
  }, [event]);
}
