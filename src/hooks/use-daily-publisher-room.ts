"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { isMockDailyPublisherToken } from "@/lib/daily-publisher-mode";
import type { PublisherSessionResult } from "@/lib/event-broadcast-client";

export type DailyPublisherJoinPhase =
  | "idle"
  | "joining"
  | "mock_joined"
  | "joined"
  | "error";

export function useDailyPublisherRoom() {
  const callRef = useRef<{ leave: () => Promise<void>; destroy: () => void } | null>(
    null
  );
  const [phase, setPhase] = useState<DailyPublisherJoinPhase>("idle");
  const [error, setError] = useState<string | null>(null);

  const leave = useCallback(async () => {
    const call = callRef.current;
    callRef.current = null;
    if (call) {
      try {
        await call.leave();
      } catch {
        /* ignore teardown */
      }
      call.destroy();
    }
    setPhase("idle");
    setError(null);
  }, []);

  const join = useCallback(
    async (
      session: PublisherSessionResult,
      localStream: MediaStream | null
    ) => {
      await leave();
      const daily = session.dailyPublisher;
      if (!daily?.meetingToken?.trim()) {
        setError("daily_token_missing");
        setPhase("error");
        return;
      }
      const token = daily.meetingToken.trim();
      if (isMockDailyPublisherToken(token)) {
        if (!localStream?.getTracks().some(t => t.readyState === "live")) {
          setError("local_preview_required_for_mock_publish");
          setPhase("error");
          return;
        }
        setPhase("mock_joined");
        setError(null);
        return;
      }

      setPhase("joining");
      setError(null);
      try {
        const Daily = await import("@daily-co/daily-js");
        const call = Daily.default.createCallObject({
          audioSource: localStream?.getAudioTracks()[0] ?? true,
          videoSource: localStream?.getVideoTracks()[0] ?? true,
        });
        callRef.current = call;
        await call.join({ url: daily.roomUrl, token });
        setPhase("joined");
      } catch (e) {
        setPhase("error");
        setError(e instanceof Error ? e.message : "daily_join_failed");
        await leave();
      }
    },
    [leave]
  );

  useEffect(() => () => {
    void leave();
  }, [leave]);

  return { phase, error, join, leave };
}
