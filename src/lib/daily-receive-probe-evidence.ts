export type ReceiveProbeSample = {
  at: string;
  videoCurrentTimeSec: number | null;
  videoWidth: number | null;
  videoHeight: number | null;
  audioLevelRms: number | null;
  remoteTrackIds: string[];
};

export type ReceiveProbeMediumVerdict = "PROVEN" | "NOT_PROVEN" | "UNKNOWN";

export type ReceiveProbeMeasurementMode = "real_daily" | "mock_synthetic";

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
  /** Camera + microphone acceptance requires both mediums PROVEN. */
  fullCameraMicrophoneAcceptance: boolean;
  exportVersion: 2;
  measurementMode: ReceiveProbeMeasurementMode;
  audioAnalyserConnected: boolean;
  audioContextState: string | null;
  /** Distinguishes silence (NOT_PROVEN) from missing measurement (UNKNOWN). */
  audioMeasurementNote: string | null;
};

const MIN_VIDEO_TIME_DELTA_SEC = 0.05;
const MIN_AUDIO_RMS = 0.01;

function videoSampleCount(samples: ReceiveProbeSample[]): number {
  return samples.filter(
    s => s.videoCurrentTimeSec != null && Number.isFinite(s.videoCurrentTimeSec)
  ).length;
}

function audioSampleCount(samples: ReceiveProbeSample[]): number {
  return samples.filter(
    s => s.audioLevelRms != null && Number.isFinite(s.audioLevelRms)
  ).length;
}

export function evaluateReceiveProbeEvidence(
  evidence: Omit<
    ReceiveProbeEvidence,
    | "decodedVideo"
    | "decodedAudio"
    | "videoReception"
    | "audioReception"
    | "fullCameraMicrophoneAcceptance"
    | "exportVersion"
    | "audioMeasurementNote"
  >
): ReceiveProbeEvidence {
  const videoTimes = evidence.samples
    .map(s => s.videoCurrentTimeSec)
    .filter((t): t is number => t != null && Number.isFinite(t));
  const audioLevels = evidence.samples
    .map(s => s.audioLevelRms)
    .filter((l): l is number => l != null && Number.isFinite(l));

  const decodedVideo =
    videoTimes.length >= 2 &&
    Math.max(...videoTimes) - Math.min(...videoTimes) >=
      MIN_VIDEO_TIME_DELTA_SEC;

  const decodedAudio =
    audioLevels.length >= 2 &&
    Math.max(...audioLevels) - Math.min(...audioLevels) >= MIN_AUDIO_RMS;

  const videoReception: ReceiveProbeMediumVerdict =
    videoSampleCount(evidence.samples) < 2
      ? "UNKNOWN"
      : decodedVideo
        ? "PROVEN"
        : "NOT_PROVEN";

  const audioSamplesWithRms = evidence.samples.filter(
    s => s.audioLevelRms != null && Number.isFinite(s.audioLevelRms)
  );
  const audioReception: ReceiveProbeMediumVerdict =
    audioSamplesWithRms.length < 2
      ? "UNKNOWN"
      : decodedAudio
        ? "PROVEN"
        : "NOT_PROVEN";

  const audioMeasurementNote =
    audioSamplesWithRms.length < 2
      ? evidence.audioAnalyserConnected
        ? "insufficient_audio_rms_samples"
        : "audio_analyser_not_connected"
      : decodedAudio
        ? null
        : "silence_or_flat_audio_rms_not_transport_disproof";

  return {
    ...evidence,
    exportVersion: 2,
    decodedVideo,
    decodedAudio,
    videoReception,
    audioReception,
    fullCameraMicrophoneAcceptance:
      videoReception === "PROVEN" && audioReception === "PROVEN",
    audioMeasurementNote,
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
