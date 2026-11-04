export type ReceiveProbeSample = {
  at: string;
  videoCurrentTimeSec: number | null;
  videoWidth: number | null;
  videoHeight: number | null;
  /** HTMLVideoElement.getVideoPlaybackQuality().totalVideoFrames when available. */
  videoFramesDecoded?: number | null;
  /** Null when the analyser is missing or the AudioContext is not running (not measured). */
  audioLevelRms: number | null;
  audioContextState?: string | null;
  remoteAudioTrackPresent?: boolean;
  remoteTrackIds: string[];
};

export type ReceiveProbeMediumVerdict = "PROVEN" | "NOT_PROVEN" | "UNKNOWN";

export type ReceiveProbeMeasurementMode = "real_daily" | "mock_synthetic";

export type ReceiveProbeAudioStatus =
  | "signal_present"
  | "silent_track"
  | "no_remote_audio_track"
  | "insufficient_samples"
  | "audio_context_not_running"
  | "analyser_not_connected";

export type ReceiveProbeVideoStatus =
  | "frames_advancing"
  | "frames_not_advancing"
  | "insufficient_samples";

export type ReceiveProbeEvidence = {
  broadcastId: string;
  roomName: string;
  startedAt: string;
  endedAt: string | null;
  samples: ReceiveProbeSample[];
  trackStartedEvents: number;
  decodedVideo: boolean;
  decodedAudio: boolean;
  videoReception: ReceiveProbeMediumVerdict;
  audioReception: ReceiveProbeMediumVerdict;
  videoStatus: ReceiveProbeVideoStatus;
  audioStatus: ReceiveProbeAudioStatus;
  /** Camera + microphone acceptance requires both mediums PROVEN. */
  fullCameraMicrophoneAcceptance: boolean;
  exportVersion: 3;
  measurementMode: ReceiveProbeMeasurementMode;
  evidenceScope:
    | "real_daily_subscriber"
    | "synthetic_local_media_not_daily_proof";
  audioAnalyserConnected: boolean;
  audioContextState: string | null;
  /** Distinguishes silence / missing measurement from failed reception. */
  audioMeasurementNote: string | null;
};

const MIN_VIDEO_TIME_DELTA_SEC = 0.05;
const MIN_VIDEO_FRAME_DELTA = 2;
export const MIN_AUDIO_RMS = 0.01;
const MIN_SAMPLES = 2;

function finite(n: number | null | undefined): n is number {
  return n != null && Number.isFinite(n);
}

function evaluateVideo(samples: ReceiveProbeSample[]): ReceiveProbeVideoStatus {
  const frames = samples.map(s => s.videoFramesDecoded).filter(finite);
  if (frames.length >= MIN_SAMPLES) {
    return Math.max(...frames) - Math.min(...frames) >= MIN_VIDEO_FRAME_DELTA
      ? "frames_advancing"
      : "frames_not_advancing";
  }
  const times = samples.map(s => s.videoCurrentTimeSec).filter(finite);
  if (times.length < MIN_SAMPLES) return "insufficient_samples";
  return Math.max(...times) - Math.min(...times) >= MIN_VIDEO_TIME_DELTA_SEC
    ? "frames_advancing"
    : "frames_not_advancing";
}

function evaluateAudio(
  samples: ReceiveProbeSample[],
  analyserConnected: boolean,
  contextState: string | null
): ReceiveProbeAudioStatus {
  const measured = samples.map(s => s.audioLevelRms).filter(finite);
  if (measured.filter(l => l >= MIN_AUDIO_RMS).length >= MIN_SAMPLES) {
    return "signal_present";
  }
  if (measured.length >= MIN_SAMPLES) {
    const trackSeen = samples.some(
      s => s.remoteAudioTrackPresent ?? s.remoteTrackIds.some(id => id.startsWith("a:"))
    );
    return trackSeen ? "silent_track" : "no_remote_audio_track";
  }
  if (!analyserConnected) {
    const trackSeen = samples.some(s => s.remoteAudioTrackPresent === true);
    return samples.length >= MIN_SAMPLES && !trackSeen
      ? "no_remote_audio_track"
      : "analyser_not_connected";
  }
  const notRunning =
    (contextState != null && contextState !== "running") ||
    samples.some(s => s.audioContextState != null && s.audioContextState !== "running");
  if (notRunning) return "audio_context_not_running";
  return "insufficient_samples";
}

const AUDIO_NOTES: Record<ReceiveProbeAudioStatus, string | null> = {
  signal_present: null,
  silent_track:
    "remote_audio_track_received_but_silent_not_transport_failure",
  no_remote_audio_track: "no_remote_audio_track_observed_by_this_subscriber",
  insufficient_samples: "insufficient_audio_rms_samples",
  audio_context_not_running: "audio_context_not_running_rms_not_measured",
  analyser_not_connected: "audio_analyser_not_connected",
};

export function evaluateReceiveProbeEvidence(
  evidence: Omit<
    ReceiveProbeEvidence,
    | "decodedVideo"
    | "decodedAudio"
    | "videoReception"
    | "audioReception"
    | "videoStatus"
    | "audioStatus"
    | "fullCameraMicrophoneAcceptance"
    | "exportVersion"
    | "evidenceScope"
    | "audioMeasurementNote"
  >
): ReceiveProbeEvidence {
  const videoStatus = evaluateVideo(evidence.samples);
  const audioStatus = evaluateAudio(
    evidence.samples,
    evidence.audioAnalyserConnected,
    evidence.audioContextState
  );

  const videoReception: ReceiveProbeMediumVerdict =
    videoStatus === "frames_advancing"
      ? "PROVEN"
      : videoStatus === "frames_not_advancing"
        ? "NOT_PROVEN"
        : "UNKNOWN";
  const audioReception: ReceiveProbeMediumVerdict =
    audioStatus === "signal_present"
      ? "PROVEN"
      : audioStatus === "no_remote_audio_track"
        ? "NOT_PROVEN"
        : "UNKNOWN";

  return {
    ...evidence,
    exportVersion: 3,
    evidenceScope:
      evidence.measurementMode === "mock_synthetic"
        ? "synthetic_local_media_not_daily_proof"
        : "real_daily_subscriber",
    decodedVideo: videoReception === "PROVEN",
    decodedAudio: audioReception === "PROVEN",
    videoReception,
    audioReception,
    videoStatus,
    audioStatus,
    fullCameraMicrophoneAcceptance:
      videoReception === "PROVEN" && audioReception === "PROVEN",
    audioMeasurementNote: AUDIO_NOTES[audioStatus],
  };
}

/** Either medium decoded proves reception for that medium only. */
export function receiveProbeMediumProven(
  evidence: ReceiveProbeEvidence,
  medium: "video" | "audio"
): boolean {
  return medium === "video"
    ? evidence.videoReception === "PROVEN"
    : evidence.audioReception === "PROVEN";
}

export function receiveProbeFullAvAcceptance(
  evidence: ReceiveProbeEvidence
): boolean {
  return evidence.fullCameraMicrophoneAcceptance;
}

/** @deprecated Use medium-specific verdicts; kept for mock self-test convenience. */
export function receiveProbePass(evidence: ReceiveProbeEvidence): boolean {
  return receiveProbeMediumProven(evidence, "video") ||
    receiveProbeMediumProven(evidence, "audio");
}

export function serializeReceiveProbeEvidence(
  evidence: ReceiveProbeEvidence
): string {
  return JSON.stringify(evidence, null, 2);
}
