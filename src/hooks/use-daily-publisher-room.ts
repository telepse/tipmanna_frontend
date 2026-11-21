"use client";

import type { DailyCall, DailyEvent, DailyEventObject } from "@daily-co/daily-js";
import { useCallback, useEffect, useRef, useState } from "react";

import { isMockDailyPublisherToken } from "@/lib/daily-publisher-mode";
import type { PublisherSessionResult } from "@/lib/event-broadcast-client";
import {
  buildDiagnosticEntry,
  snapshotDailyCallState,
  snapshotWebrtcOutbound,
  type PublisherClientDiagnosticEntry,
} from "@/lib/native-publisher-client-diagnostics";

export type DailyPublisherJoinPhase =
  | "idle"
  | "joining"
  | "mock_joined"
  | "joined"
  | "error";

type UseDailyPublisherRoomOptions = {
  broadcastId?: string;
  emitDiagnostic?: (entry: PublisherClientDiagnosticEntry) => void;
};

const LIVE_STREAMING_EVENTS = [
  "live-streaming-started",
  "live-streaming-updated",
  "live-streaming-stopped",
  "live-streaming-error",
] as const satisfies readonly DailyEvent[];

type LiveStreamingEvent = (typeof LIVE_STREAMING_EVENTS)[number];

function liveStreamingInstancePresent(
  event: DailyEventObject<LiveStreamingEvent>
): boolean {
  if ("instanceId" in event && event.instanceId) {
    return true;
  }
  return false;
}

export function useDailyPublisherRoom(options?: UseDailyPublisherRoomOptions) {
  const callRef = useRef<DailyCall | null>(null);
  const [phase, setPhase] = useState<DailyPublisherJoinPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const emitRef = useRef(options?.emitDiagnostic);
  const broadcastIdRef = useRef(options?.broadcastId);
  emitRef.current = options?.emitDiagnostic;
  broadcastIdRef.current = options?.broadcastId;

  const emit = useCallback(
    (
      stage: PublisherClientDiagnosticEntry["stage"],
      partial: Omit<
        PublisherClientDiagnosticEntry,
        "at" | "stage" | "broadcastId"
      >
    ) => {
      const id = broadcastIdRef.current;
      if (!id || !emitRef.current) return;
      emitRef.current(buildDiagnosticEntry(id, stage, partial));
    },
    []
  );

  const leave = useCallback(async () => {
    const call = callRef.current;
    callRef.current = null;
    if (call) {
      emit("daily_left", {
        note: "server_side_rtmp_no_client_stop",
      });
      try {
        await call.leave();
      } catch {
        /* ignore teardown */
      }
      await call.destroy();
    }
    setPhase("idle");
    setError(null);
  }, [emit]);

  const snapshotJoined = useCallback(async () => {
    const call = callRef.current;
    const id = broadcastIdRef.current;
    if (!call || !id || !emitRef.current) return;
    const dailyCall = await snapshotDailyCallState(call, "joined");
    const webrtcOutbound = await snapshotWebrtcOutbound(call);
    emitRef.current(
      buildDiagnosticEntry(id, "periodic_snapshot", {
        dailyCall,
        webrtcOutbound,
        note: "server_rtmp_rest_start_client_events_may_be_absent",
      })
    );
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

      emit("daily_join_start", {
        note: "createCallObject_with_preview_tracks",
      });

      setPhase("joining");
      setError(null);
      try {
        const Daily = await import("@daily-co/daily-js");
        const call = Daily.default.createCallObject({
          audioSource: localStream?.getAudioTracks()[0] ?? true,
          videoSource: localStream?.getVideoTracks()[0] ?? true,
        });
        callRef.current = call;

        for (const ev of LIVE_STREAMING_EVENTS) {
          call.on(ev, (event: DailyEventObject<LiveStreamingEvent>) => {
            emit("live_streaming_event", {
              liveStreaming: {
                action: ev,
                instanceIdPresent: liveStreamingInstancePresent(event),
                errorType:
                  ev === "live-streaming-error" ? "present" : null,
              },
              note: "client_live_streaming_event_may_not_fire_for_rest_rtmp",
            });
          });
        }

        await call.join({ url: daily.roomUrl, token });
        setPhase("joined");
        const dailyCall = await snapshotDailyCallState(call, "joined");
        const webrtcOutbound = await snapshotWebrtcOutbound(call);
        emit("daily_joined", { dailyCall, webrtcOutbound });
      } catch (e) {
        setPhase("error");
        const message = e instanceof Error ? e.message : "daily_join_failed";
        setError(message);
        emit("daily_join_error", { note: message.slice(0, 200) });
        await leave();
      }
    },
    [leave, emit]
  );

  useEffect(
    () => () => {
      void leave();
    },
    [leave]
  );

  return { phase, error, join, leave, snapshotJoined };
}
