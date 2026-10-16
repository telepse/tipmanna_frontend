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

const MAX_TOKEN_REFRESH_ATTEMPTS = 12;
const TOKEN_REFRESH_INTERVAL_MS = 2_000;

type Args = {
  eventId: string;
  broadcastId: string | undefined;
  /** Poll while starting/live so room prep can finish before YouTube live confirm. */
  sessionSyncActive: boolean;
  dailyRoomReady: boolean;
  broadcastAuthOptions: EventBroadcastActionOptions;
  publisherSession: PublisherSessionResult | null;
  setPublisherSession: (session: PublisherSessionResult | null) => void;
  onSyncError?: (message: string) => void;
};

/**
 * Re-issue publisher session when the scoped Daily room becomes ready so Join
 * unlocks without a manual second Claim (room is created on Start, not first Claim).
 * Retries are bounded and do not require broadcast phase === live.
 */
export function usePublisherSessionSync({
  eventId,
  broadcastId,
  sessionSyncActive,
  dailyRoomReady,
  broadcastAuthOptions,
  publisherSession,
  setPublisherSession,
  onSyncError,
}: Args): void {
  const inFlightRef = useRef(false);
  const attemptsRef = useRef(0);

  const hasLease = Boolean(publisherSession);
  const hasDailyToken = Boolean(
    publisherSession?.dailyPublisher?.meetingToken?.trim()
  );
  const needsTokenRefresh =
    sessionSyncActive &&
    Boolean(broadcastId && dailyRoomReady && hasLease && !hasDailyToken);

  useEffect(() => {
    if (!broadcastId || !sessionSyncActive) {
      attemptsRef.current = 0;
    }
  }, [broadcastId, sessionSyncActive]);

  useEffect(() => {
    if (hasDailyToken) {
      attemptsRef.current = 0;
    }
  }, [hasDailyToken]);

  useEffect(() => {
    if (!needsTokenRefresh || !broadcastId) return;

    const refreshToken = () => {
      if (inFlightRef.current) return;
      if (attemptsRef.current >= MAX_TOKEN_REFRESH_ATTEMPTS) {
        onSyncError?.(
          "Daily publisher token still pending after room ready (refresh status or reclaim)."
        );
        return;
      }

      inFlightRef.current = true;
      const deviceId = getNativeBroadcastDeviceSessionId();

      void issueEventBroadcastPublisherSessionAction(
        eventId,
        broadcastId,
        deviceId,
        broadcastAuthOptions
      )
        .then(res => {
          attemptsRef.current += 1;
          if (res.success && res.data) {
            setPublisherSession(res.data);
            if (res.data.dailyPublisher?.meetingToken?.trim()) {
              attemptsRef.current = 0;
            }
          } else if (res.error) {
            onSyncError?.(res.error);
          }
        })
        .finally(() => {
          inFlightRef.current = false;
        });
    };

    refreshToken();
    const timer = window.setInterval(refreshToken, TOKEN_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [
    needsTokenRefresh,
    eventId,
    broadcastId,
    broadcastAuthOptions,
    setPublisherSession,
    onSyncError,
  ]);
}
