"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import type { RealtimeSurface } from "@/lib/realtime-telemetry";
import { registerLegacyTipStreamProducer } from "@/lib/legacy-tip-stream-producer";
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
 * Page-level owner for the tip-animation stream. Registers exactly one producer:
 * broker path when enabled, legacy/fallback path when explicitly disabled.
 * Nested providers do not create a second Pusher producer; nested
 * `useGlobalTipStream` calls become no-ops.
 */
export function GlobalTipStreamProvider({
  eventId,
  enabled = true,
  surface = "event_room",
  children,
}: GlobalTipStreamProviderProps) {
  const parent = useContext(GlobalTipStreamContext);
  const shouldOwn = enabled && !parent.streamOwned;
  const brokerEnabled = isSingleTipStreamBrokerEnabled();

  useEffect(() => {
    if (!shouldOwn || typeof window === "undefined") return;
    if (brokerEnabled) {
      return registerTipStreamConsumer({ eventId, surface });
    }
    return registerLegacyTipStreamProducer({ eventId, surface });
  }, [shouldOwn, brokerEnabled, eventId, surface]);

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
