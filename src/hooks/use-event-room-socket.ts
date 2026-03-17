"use client";

import { useEffect, useRef } from "react";

export const useEventRoomSocket = (
  eventId: string,
  onNewTip: (payload: unknown) => void
) => {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!eventId) return;

    // Connect to WebSocket server
    const ws = new WebSocket(`ws://${process.env.NEXT_PUBLIC_BACKEND_API_URL}?eventId=${eventId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log(`Connected to WebSocket for event ${eventId}`);
    };

    ws.onmessage = event => {
      try {
        const data = JSON.parse(event.data);
        // Listen only for new tip messages
        if (data.type === "tip-animation") {
          onNewTip(data.payload);
        }
      } catch (err) {
        console.error("Failed to parse WebSocket message", err);
      }
    };

    ws.onclose = () => {
      console.log(`WebSocket disconnected for event ${eventId}`);
    };

    return () => {
      ws.close();
    };
  }, [eventId, onNewTip]);
};
