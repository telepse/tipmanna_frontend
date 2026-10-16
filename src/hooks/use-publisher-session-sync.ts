"use client";

import { useEffect, useRef } from "react";

import {
  issueEventBroadcastPublisherSessionAction,
  type EventBroadcastActionOptions,
} from "@/actions/event-broadcast";
import {
  getNativeBroadcastDeviceSessionId,
  type PublisherSessionResult,
} from "@/lib/event-broadcast-client";

type Args = {
  eventId: string;
  broadcastId: string | undefined;
  dailyRoomReady: boolean;
  broadcastAuthOptions: EventBroadcastActionOptions;
  publisherSession: PublisherSessionResult | null;
  setPublisherSession: (session: PublisherSessionResult | null) => void;
};

/**
 * Re-issue publisher session when the scoped Daily room becomes ready so Join
 * unlocks without a manual second Claim (room is created on Start, not first Claim).
 */
export function usePublisherSessionSync({
  eventId,
  broadcastId,
  dailyRoomReady,
  broadcastAuthOptions,
  publisherSession,
  setPublisherSession,
}: Args): void {
  const inFlightRef = useRef(false);
  const hasLease = Boolean(publisherSession);
  const hasDailyToken = Boolean(
    publisherSession?.dailyPublisher?.meetingToken?.trim()
  );
  const needsTokenRefresh =
    Boolean(broadcastId && dailyRoomReady && hasLease && !hasDailyToken);

  useEffect(() => {
    if (!needsTokenRefresh || !broadcastId || inFlightRef.current) return;

    inFlightRef.current = true;
    const deviceId = getNativeBroadcastDeviceSessionId();

    void issueEventBroadcastPublisherSessionAction(
      eventId,
      broadcastId,
      deviceId,
      broadcastAuthOptions
    )
      .then(res => {
        if (res.success && res.data) {
          setPublisherSession(res.data);
        }
      })
      .finally(() => {
        inFlightRef.current = false;
      });
  }, [
    needsTokenRefresh,
    eventId,
    broadcastId,
    broadcastAuthOptions,
    setPublisherSession,
  ]);
}
