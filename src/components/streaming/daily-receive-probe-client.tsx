"use client";

import type { DailyCall, DailyEventObject } from "@daily-co/daily-js";
import { useCallback, useEffect, useRef, useState } from "react";

import { isMockDailyReceiveProbeToken } from "@/lib/daily-receive-probe-mode";
import {
  evaluateReceiveProbeEvidence,
  receiveProbeFullAvAcceptance,
  receiveProbeMediumProven,
  serializeReceiveProbeEvidence,
  type ReceiveProbeEvidence,
  type ReceiveProbeMeasurementMode,
  type ReceiveProbeSample,
} from "@/lib/daily-receive-probe-evidence";

export type DailyReceiveProbeConfig = {
  broadcastId: string;
  roomName: string;
  roomUrl: string;
  meetingToken: string;
  /** Mock self-test only: synthetic oscillator level. */
  mockAudio?: "tone" | "silent";
};

type Props = {
  config: DailyReceiveProbeConfig;
};

export const RECEIVE_PROBE_LAST_EVIDENCE_KEY =
  "finish-a-receive-probe-last-evidence";

const SAMPLE_INTERVAL_MS = 2000;

export function DailyReceiveProbeClient({ config }: Props) {
  const callRef = useRef<DailyCall | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const remoteAudioTrackRef = useRef<MediaStreamTrack | null>(null);
  const mockCleanupRef = useRef<(() => void) | null>(null);
  const measurementModeRef = useRef<ReceiveProbeMeasurementMode>("real_daily");
  const trackStartedRef = useRef(0);
  const samplesRef = useRef<ReceiveProbeSample[]>([]);
  const startedAtRef = useRef<string>(new Date().toISOString());
  const [phase, setPhase] = useState<"idle" | "joining" | "joined" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);
  const [audioContextState, setAudioContextState] = useState<string | null>(
    null
  );
  const [evidence, setEvidence] = useState<ReceiveProbeEvidence | null>(null);

  const isMock = isMockDailyReceiveProbeToken(config.meetingToken);

  /** Must run inside the Join click so autoplay policy allows a running context. */
  const ensureAudioContext = useCallback((): AudioContext => {
    let ctx = audioContextRef.current;
    if (!ctx || ctx.state === "closed") {
      ctx = new AudioContext();
      audioContextRef.current = ctx;
      const current = ctx;
      current.onstatechange = () => setAudioContextState(current.state);
    }
    setAudioContextState(ctx.state);
    return ctx;
  }, []);

  const resumeAudio = useCallback(async () => {
    const ctx = audioContextRef.current;
    if (!ctx) return;
    await ctx.resume().catch(() => {});
    setAudioContextState(ctx.state);
    void audioElRef.current?.play().catch(() => {});
  }, []);

  const readAudioLevelRms = useCallback((): number | null => {
    const analyser = analyserRef.current;
    const ctx = audioContextRef.current;
    if (!analyser || !ctx || ctx.state !== "running") return null;
    const data = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(data);
    let sumSq = 0;
    for (let i = 0; i < data.length; i += 1) {
      sumSq += data[i] * data[i];
    }
    return Math.sqrt(sumSq / data.length);
  }, []);

  const finalizeEvidence = useCallback((): ReceiveProbeEvidence => {
    const evaluated = evaluateReceiveProbeEvidence({
      broadcastId: config.broadcastId,
      roomName: config.roomName,
      startedAt: startedAtRef.current,
      endedAt: new Date().toISOString(),
      trackStartedEvents: trackStartedRef.current,
      samples: [...samplesRef.current],
      measurementMode: measurementModeRef.current,
      audioAnalyserConnected: Boolean(analyserRef.current),
      audioContextState: audioContextRef.current?.state ?? null,
    });
    setEvidence(evaluated);
    try {
      localStorage.setItem(
        RECEIVE_PROBE_LAST_EVIDENCE_KEY,
        serializeReceiveProbeEvidence(evaluated)
      );
    } catch {
      /* storage unavailable */
    }
    return evaluated;
  }, [config.broadcastId, config.roomName]);

  const captureSample = useCallback(() => {
    const video = videoRef.current;
    const remoteTrackIds: string[] = [];
    const call = callRef.current;
    if (call) {
      for (const [id, p] of Object.entries(call.participants())) {
        if (id === "local") continue;
        if (p.tracks.video.state === "playable") remoteTrackIds.push(`v:${id}`);
        if (p.tracks.audio.state === "playable") remoteTrackIds.push(`a:${id}`);
      }
    } else if (measurementModeRef.current === "mock_synthetic") {
      remoteTrackIds.push("mock:v:synthetic", "mock:a:synthetic");
    }
    const quality = video?.getVideoPlaybackQuality?.();
    samplesRef.current.push({
      at: new Date().toISOString(),
      videoCurrentTimeSec: video?.currentTime ?? null,
      videoWidth: video?.videoWidth ?? null,
      videoHeight: video?.videoHeight ?? null,
      videoFramesDecoded: quality ? quality.totalVideoFrames : null,
      audioLevelRms: readAudioLevelRms(),
      audioContextState: audioContextRef.current?.state ?? null,
      remoteAudioTrackPresent:
        remoteAudioTrackRef.current?.readyState === "live",
      remoteTrackIds,
    });
    finalizeEvidence();
  }, [finalizeEvidence, readAudioLevelRms]);

  const attachRemoteVideo = useCallback((stream: MediaStream) => {
    const el = videoRef.current;
    if (!el) return;
    el.srcObject = stream;
    void el.play().catch(() => {});
  }, []);

  const attachRemoteAudio = useCallback(
    (track: MediaStreamTrack) => {
      remoteAudioTrackRef.current = track;
      // Chromium may not feed remote WebRTC audio into Web Audio unless the
      // stream is also attached to a media element (muted is sufficient).
      if (audioElRef.current) {
        audioElRef.current.srcObject = new MediaStream([track]);
        void audioElRef.current.play().catch(() => {});
      }
      try {
        const ctx = ensureAudioContext();
        audioSourceRef.current?.disconnect();
        const source = ctx.createMediaStreamSource(new MediaStream([track]));
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);
        audioSourceRef.current = source;
        analyserRef.current = analyser;
        void ctx.resume().catch(() => {});
      } catch {
        analyserRef.current = null;
      }
    },
    [ensureAudioContext]
  );

  const teardownMedia = useCallback(async () => {
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
    mockCleanupRef.current?.();
    mockCleanupRef.current = null;
    audioSourceRef.current?.disconnect();
    audioSourceRef.current = null;
    analyserRef.current = null;
    remoteAudioTrackRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    if (audioElRef.current) audioElRef.current.srcObject = null;
  }, []);

  const leave = useCallback(async () => {
    if (samplesRef.current.length > 0) finalizeEvidence();
    await teardownMedia();
    const ctx = audioContextRef.current;
    audioContextRef.current = null;
    if (ctx) void ctx.close().catch(() => {});
    setAudioContextState(null);
    setPhase("idle");
  }, [finalizeEvidence, teardownMedia]);

  const startMockMedia = useCallback(
    (ctx: AudioContext) => {
      const osc = ctx.createOscillator();
      osc.frequency.value = 440;
      const gain = ctx.createGain();
      gain.gain.value = config.mockAudio === "silent" ? 0 : 0.3;
      const dest = ctx.createMediaStreamDestination();
      osc.connect(gain).connect(dest);
      osc.start();

      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 240;
      const g = canvas.getContext("2d");
      let frame = 0;
      const draw = window.setInterval(() => {
        if (!g) return;
        frame += 1;
        g.fillStyle = `hsl(${(frame * 7) % 360} 70% 40%)`;
        g.fillRect(0, 0, canvas.width, canvas.height);
        g.fillStyle = "#fff";
        g.font = "20px monospace";
        g.fillText(`SYNTHETIC ${frame}`, 20, 120);
      }, 66);
      const videoStream = canvas.captureStream(15);

      attachRemoteVideo(videoStream);
      attachRemoteAudio(dest.stream.getAudioTracks()[0]);
      trackStartedRef.current = 2;

      mockCleanupRef.current = () => {
        window.clearInterval(draw);
        try {
          osc.stop();
        } catch {
          /* already stopped */
        }
        videoStream.getTracks().forEach(t => t.stop());
        dest.stream.getTracks().forEach(t => t.stop());
      };
    },
    [attachRemoteAudio, attachRemoteVideo, config.mockAudio]
  );

  const join = useCallback(async () => {
    const ctx = ensureAudioContext();
    await teardownMedia();
    setPhase("joining");
    setError(null);
    samplesRef.current = [];
    trackStartedRef.current = 0;
    startedAtRef.current = new Date().toISOString();
    setEvidence(null);

    const token = config.meetingToken.trim();
    if (isMockDailyReceiveProbeToken(token)) {
      measurementModeRef.current = "mock_synthetic";
      startMockMedia(ctx);
      setPhase("joined");
      return;
    }

    measurementModeRef.current = "real_daily";
    try {
      const Daily = await import("@daily-co/daily-js");
      const call = Daily.default.createCallObject({
        audioSource: false,
        videoSource: false,
      });
      callRef.current = call;
      call.on("track-started", (ev: DailyEventObject<"track-started">) => {
        if (ev.participant?.local) return;
        const track = ev.track;
        if (!track) return;
        trackStartedRef.current += 1;
        if (track.kind === "video") {
          attachRemoteVideo(new MediaStream([track]));
        } else if (track.kind === "audio") {
          attachRemoteAudio(track);
        }
      });
      await call.join({ url: config.roomUrl, token });
      setPhase("joined");
    } catch (e) {
      setPhase("error");
      setError(e instanceof Error ? e.message : "join_failed");
    }
  }, [
    attachRemoteAudio,
    attachRemoteVideo,
    config.meetingToken,
    config.roomUrl,
    ensureAudioContext,
    startMockMedia,
    teardownMedia,
  ]);

  useEffect(() => {
    if (phase !== "joined") return;
    const id = window.setInterval(captureSample, SAMPLE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [phase, captureSample]);

  useEffect(
    () => () => {
      void leave();
    },
    [leave]
  );

  const exportJson = () => {
    const payload = finalizeEvidence();
    const blob = new Blob([serializeReceiveProbeEvidence(payload)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `daily-receive-probe-${payload.measurementMode}-${config.broadcastId.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const videoProven = evidence
    ? receiveProbeMediumProven(evidence, "video")
    : null;
  const audioProven = evidence
    ? receiveProbeMediumProven(evidence, "audio")
    : null;
  const fullAv = evidence ? receiveProbeFullAvAcceptance(evidence) : null;

  return (
    <main className="mx-auto max-w-lg space-y-4 p-4 font-mono text-sm">
      <h1 className="text-lg font-semibold">Daily receive-only probe</h1>
      {isMock ? (
        <p
          data-receive-probe-mock-banner
          className="rounded border border-amber-500 bg-amber-100 p-2 font-semibold text-amber-900"
        >
          SYNTHETIC LOCAL MEDIA — NOT DAILY EVIDENCE (
          {config.mockAudio === "silent" ? "silent tone" : "440 Hz tone"})
        </p>
      ) : null}
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
        <dd data-receive-probe-phase>{phase}</dd>
        <dt>audio context</dt>
        <dd data-receive-probe-audio-context>{audioContextState ?? "none"}</dd>
      </dl>
      {error ? <p className="text-red-600">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="rounded border px-3 py-1" onClick={() => void join()}>
          Join (receive-only)
        </button>
        <button
          type="button"
          className="rounded border px-3 py-1"
          disabled={!audioContextState || audioContextState === "running"}
          onClick={() => void resumeAudio()}
        >
          Resume audio
        </button>
        <button type="button" className="rounded border px-3 py-1" onClick={captureSample}>
          Sample now
        </button>
        <button type="button" className="rounded border px-3 py-1" onClick={exportJson}>
          Export evidence JSON
        </button>
        <button type="button" className="rounded border px-3 py-1" onClick={() => void leave()}>
          Leave
        </button>
      </div>
      <video
        data-receive-probe-video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="max-h-48 w-full bg-black"
      />
      <audio ref={audioElRef} autoPlay muted className="hidden" />
      {evidence ? (
        <ul className="list-inside list-disc text-xs">
          <li data-receive-probe-video-verdict>
            Video reception: {evidence.videoReception} ({evidence.videoStatus})
            {videoProven ? " — decode proven" : ""}
          </li>
          <li data-receive-probe-audio-verdict>
            Audio reception: {evidence.audioReception} ({evidence.audioStatus})
            {audioProven ? " — signal proven" : ""}
          </li>
          <li>
            Full camera + microphone acceptance:{" "}
            {fullAv ? "YES (both proven)" : "NO (requires both PROVEN)"}
          </li>
          <li>Evidence scope: {evidence.evidenceScope}</li>
        </ul>
      ) : null}
      {evidence ? (
        <pre
          data-receive-probe-evidence
          className="max-h-64 overflow-auto rounded bg-muted p-2 text-xs"
        >
          {serializeReceiveProbeEvidence(evidence)}
        </pre>
      ) : null}
    </main>
  );
}
