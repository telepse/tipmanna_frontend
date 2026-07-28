"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import type { RealtimeSurface } from "@/lib/realtime-telemetry";
import { isSingleTipStreamBrokerEnabled } from "@/lib/single-tip-stream-broker-flag";
import { registerTipStreamConsumer } from "@/lib/shared-tip-stream-broker";

interface GlobalTipStreamContextValue {
  /** True when an ancestor provider already owns the shared stream for this tree. */
  streamOwned: boolean;
}

const GlobalTipStreamContext = createContext<GlobalTipStreamContextValue>({
  streamOwned: false,
});

export interface GlobalTipStreamProviderProps {
  eventId?: string;
  enabled?: boolean;
  surface?: RealtimeSurface;
  children: ReactNode;
}

/**
 * Page-level owner for the shared tip-animation stream. Nested providers do not
 * create a second Pusher producer; nested `useGlobalTipStream` calls become no-ops.
 */
export function GlobalTipStreamProvider({
  eventId,
  enabled = true,
  surface = "event_room",
  children,
}: GlobalTipStreamProviderProps) {
  const parent = useContext(GlobalTipStreamContext);
  const shouldOwn =
    enabled && isSingleTipStreamBrokerEnabled() && !parent.streamOwned;

  useEffect(() => {
    if (!shouldOwn || typeof window === "undefined") return;
    return registerTipStreamConsumer({ eventId, surface });
  }, [shouldOwn, eventId, surface]);

  return (
    <GlobalTipStreamContext.Provider
      value={{ streamOwned: shouldOwn || parent.streamOwned }}
    >
      {children}
    </GlobalTipStreamContext.Provider>
  );
}

export function useGlobalTipStreamOwnedByProvider(): boolean {
  return useContext(GlobalTipStreamContext).streamOwned;
}
