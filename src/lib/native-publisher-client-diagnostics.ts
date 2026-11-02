/** Sanitized publisher-side diagnostics (no tokens, URLs, or media). */

export type PublisherClientDiagnosticStage =
  | "preview_start"
  | "preview_stop"
  | "daily_join_start"
  | "daily_joined"
  | "daily_join_error"
  | "daily_left"
  | "broadcast_start_clicked"
  | "broadcast_stop_clicked"
  | "live_streaming_event"
  | "periodic_snapshot";

export type PublisherClientDiagnosticEntry = {
  at: string;
  stage: PublisherClientDiagnosticStage;
  broadcastId: string;
  localPreview?: {
    active: boolean | "UNKNOWN";
    audioTrackCount: number | "UNKNOWN";
    videoTrackCount: number | "UNKNOWN";
    audioLiveCount: number | "UNKNOWN";
    videoLiveCount: number | "UNKNOWN";
  };
  dailyCall?: {
    joinPhase: string | "UNKNOWN";
    localAudio: boolean | "UNKNOWN";
    localVideo: boolean | "UNKNOWN";
    meetingSessionIdPresent: boolean | "UNKNOWN";
  };
  liveStreaming?: {
    action: string;
    instanceIdPresent: boolean | "UNKNOWN";
    errorType: string | null;
  };
  webrtcOutbound?: {
    supported: boolean;
    audioBytesSent: number | "UNKNOWN";
    videoBytesSent: number | "UNKNOWN";
    audioPacketsSent: number | "UNKNOWN";
    videoPacketsSent: number | "UNKNOWN";
  };
  note?: string | null;
};

export function summarizeLocalPreviewStream(
  stream: MediaStream | null,
  active: boolean
): PublisherClientDiagnosticEntry["localPreview"] {
  if (!stream) {
    return {
      active,
      audioTrackCount: 0,
      videoTrackCount: 0,
      audioLiveCount: 0,
      videoLiveCount: 0,
    };
  }
  const audioTracks = stream.getAudioTracks();
  const videoTracks = stream.getVideoTracks();
  return {
    active,
    audioTrackCount: audioTracks.length,
    videoTrackCount: videoTracks.length,
    audioLiveCount: audioTracks.filter(t => t.readyState === "live").length,
    videoLiveCount: videoTracks.filter(t => t.readyState === "live").length,
  };
}

type DailyCallLike = {
  localAudio?: () => boolean;
  localVideo?: () => boolean;
  participants?: () => Record<string, { session_id?: string }>;
  getNetworkStats?: () => Promise<
    Record<
      string,
      {
        audio?: { bytesSent?: number; packetsSent?: number };
        video?: { bytesSent?: number; packetsSent?: number };
      }
    >
  >;
};

export async function snapshotDailyCallState(
  call: DailyCallLike | null,
  joinPhase: string
): Promise<PublisherClientDiagnosticEntry["dailyCall"]> {
  if (!call) {
    return {
      joinPhase,
      localAudio: "UNKNOWN",
      localVideo: "UNKNOWN",
      meetingSessionIdPresent: "UNKNOWN",
    };
  }
  let localAudio: boolean | "UNKNOWN" = "UNKNOWN";
  let localVideo: boolean | "UNKNOWN" = "UNKNOWN";
  try {
    localAudio = call.localAudio?.() ?? "UNKNOWN";
    localVideo = call.localVideo?.() ?? "UNKNOWN";
  } catch {
    /* keep UNKNOWN */
  }
  let meetingSessionIdPresent: boolean | "UNKNOWN" = "UNKNOWN";
  try {
    const parts = call.participants?.() ?? {};
    const local = Object.values(parts).find(p => p.session_id);
    meetingSessionIdPresent = Boolean(local?.session_id);
  } catch {
    meetingSessionIdPresent = "UNKNOWN";
  }
  return {
    joinPhase,
    localAudio,
    localVideo,
    meetingSessionIdPresent,
  };
}

export async function snapshotWebrtcOutbound(
  call: DailyCallLike | null
): Promise<PublisherClientDiagnosticEntry["webrtcOutbound"]> {
  if (!call?.getNetworkStats) {
    return {
      supported: false,
      audioBytesSent: "UNKNOWN",
      videoBytesSent: "UNKNOWN",
      audioPacketsSent: "UNKNOWN",
      videoPacketsSent: "UNKNOWN",
    };
  }
  try {
    const stats = await call.getNetworkStats();
    const local = Object.values(stats)[0];
    return {
      supported: true,
      audioBytesSent: local?.audio?.bytesSent ?? "UNKNOWN",
      videoBytesSent: local?.video?.bytesSent ?? "UNKNOWN",
      audioPacketsSent: local?.audio?.packetsSent ?? "UNKNOWN",
      videoPacketsSent: local?.video?.packetsSent ?? "UNKNOWN",
    };
  } catch {
    return {
      supported: true,
      audioBytesSent: "UNKNOWN",
      videoBytesSent: "UNKNOWN",
      audioPacketsSent: "UNKNOWN",
      videoPacketsSent: "UNKNOWN",
    };
  }
}

export function buildDiagnosticEntry(
  broadcastId: string,
  stage: PublisherClientDiagnosticStage,
  partial: Omit<PublisherClientDiagnosticEntry, "at" | "stage" | "broadcastId">
): PublisherClientDiagnosticEntry {
  return {
    at: new Date().toISOString(),
    stage,
    broadcastId,
    ...partial,
  };
}
