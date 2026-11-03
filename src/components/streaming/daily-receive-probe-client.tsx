"use client";

import type { DailyCall, DailyEventObject } from "@daily-co/daily-js";
import { useCallback, useEffect, useRef, useState } from "react";

import { isMockDailyReceiveProbeToken } from "@/lib/daily-receive-probe-mode";
import {
  evaluateReceiveProbeEvidence,
  receiveProbePass,
  serializeReceiveProbeEvidence,
  type ReceiveProbeEvidence,
  type ReceiveProbeSample,
} from "@/lib/daily-receive-probe-evidence";

export type DailyReceiveProbeConfig = {
  broadcastId: string;
  roomName: string;
  roomUrl: string;
  meetingToken: string;
};

type Props = {
  config: DailyReceiveProbeConfig;
};

export function DailyReceiveProbeClient({ config }: Props) {
  const callRef = useRef<DailyCall | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [phase, setPhase] = useState<"idle" | "joining" | "joined" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);
  const [trackStartedEvents, setTrackStartedEvents] = useState(0);
  const samplesRef = useRef<ReceiveProbeSample[]>([]);
  const startedAtRef = useRef<string>(new Date().toISOString());
  const [evidence, setEvidence] = useState<ReceiveProbeEvidence | null>(null);

  const captureSample = useCallback(async () => {
    const video = document.querySelector<HTMLVideoElement>(
      "[data-receive-probe-video]"
    );
    let audioLevelRms: number | null = null;
    const call = callRef.current;
    const remoteTrackIds: string[] = [];
    if (call) {
      const parts = call.participants();
      for (const [id, p] of Object.entries(parts)) {
        if (id === "local") continue;
        if (p.tracks.video.state === "playable") remoteTrackIds.push(`v:${id}`);
        if (p.tracks.audio.state === "playable") remoteTrackIds.push(`a:${id}`);
      }
    }
    samplesRef.current.push({
      at: new Date().toISOString(),
      videoCurrentTimeSec: video?.currentTime ?? null,
      videoWidth: video?.videoWidth ?? null,
      videoHeight: video?.videoHeight ?? null,
      audioLevelRms,
      remoteTrackIds,
    });
  }, []);

  const finalizeEvidence = useCallback(() => {
    const evaluated = evaluateReceiveProbeEvidence({
      broadcastId: config.broadcastId,
      roomName: config.roomName,
      startedAt: startedAtRef.current,
      endedAt: new Date().toISOString(),
      trackStartedEvents,
      samples: samplesRef.current,
    });
    setEvidence(evaluated);
    return evaluated;
  }, [config.broadcastId, config.roomName, trackStartedEvents]);

  const leave = useCallback(async () => {
    const call = callRef.current;
    callRef.current = null;
    if (call) {
      try {
        await call.leave();
        await call.destroy();
      } catch {
        /* ignore */
      }
    }
  }, []);

  const join = useCallback(async () => {
    await leave();
    setPhase("joining");
    setError(null);
    samplesRef.current = [];
    startedAtRef.current = new Date().toISOString();
    setTrackStartedEvents(0);
    setEvidence(null);

    const token = config.meetingToken.trim();
    if (isMockDailyReceiveProbeToken(token)) {
      setPhase("joined");
      samplesRef.current.push(
        {
          at: new Date().toISOString(),
          videoCurrentTimeSec: 0.1,
          videoWidth: 640,
          videoHeight: 480,
          audioLevelRms: null,
          remoteTrackIds: ["mock:v:remote"],
        },
        {
          at: new Date().toISOString(),
          videoCurrentTimeSec: 0.35,
          videoWidth: 640,
          videoHeight: 480,
          audioLevelRms: null,
          remoteTrackIds: ["mock:v:remote"],
        }
      );
      setTrackStartedEvents(1);
      finalizeEvidence();
      return;
    }

    try {
      const Daily = await import("@daily-co/daily-js");
      const call = Daily.default.createCallObject({
        audioSource: false,
        videoSource: false,
      });
      callRef.current = call;
      call.on("track-started", (ev: DailyEventObject<"track-started">) => {
        setTrackStartedEvents(n => n + 1);
        const track = ev.track;
        if (track?.kind === "video" && videoRef.current) {
          videoRef.current.srcObject = new MediaStream([track]);
        }
      });
      await call.join({ url: config.roomUrl, token });
      setPhase("joined");
    } catch (e) {
      setPhase("error");
      setError(e instanceof Error ? e.message : "join_failed");
    }
  }, [config.meetingToken, config.roomUrl, finalizeEvidence, leave]);

  useEffect(() => {
    if (phase !== "joined" || isMockDailyReceiveProbeToken(config.meetingToken)) {
      return;
    }
    const id = window.setInterval(() => {
      void captureSample();
    }, 2000);
    return () => window.clearInterval(id);
  }, [phase, captureSample, config.meetingToken]);

  useEffect(
    () => () => {
      void leave();
    },
    [leave]
  );

  const exportJson = () => {
    const payload = evidence ?? finalizeEvidence();
    const blob = new Blob([serializeReceiveProbeEvidence(payload)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `daily-receive-probe-${config.broadcastId.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pass = evidence ? receiveProbePass(evidence) : null;

  return (
    <main className="mx-auto max-w-lg space-y-4 p-4 font-mono text-sm">
      <h1 className="text-lg font-semibold">Daily receive-only probe</h1>
      <p className="text-muted-foreground">
        Subscribe-only participant — no publish. Export JSON includes decode
        criteria (track-started alone is insufficient).
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1">
        <dt>broadcast</dt>
        <dd>{config.broadcastId}</dd>
        <dt>room</dt>
        <dd>{config.roomName}</dd>
        <dt>phase</dt>
        <dd>{phase}</dd>
      </dl>
      {error ? <p className="text-red-600">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="rounded border px-3 py-1" onClick={() => void join()}>
          Join (receive-only)
        </button>
        <button
          type="button"
          className="rounded border px-3 py-1"
          onClick={() => {
            void captureSample();
            finalizeEvidence();
          }}
        >
          Sample now
        </button>
        <button type="button" className="rounded border px-3 py-1" onClick={exportJson}>
          Export evidence JSON
        </button>
        <button type="button" className="rounded border px-3 py-1" onClick={() => void leave()}>
          Leave
        </button>
      </div>
      {!isMockDailyReceiveProbeToken(config.meetingToken) ? (
        <video
          data-receive-probe-video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="max-h-48 w-full bg-black"
        />
      ) : null}
      {evidence ? (
        <pre className="max-h-64 overflow-auto rounded bg-muted p-2 text-xs">
          {serializeReceiveProbeEvidence(evidence)}
        </pre>
      ) : null}
      {pass != null ? (
        <p>{pass ? "PASS (decode criteria met)" : "FAIL (no decode proof yet)"}</p>
      ) : null}
    </main>
  );
}
