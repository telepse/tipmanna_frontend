export type ReceiveProbeSample = {
  at: string;
  videoCurrentTimeSec: number | null;
  videoWidth: number | null;
  videoHeight: number | null;
  audioLevelRms: number | null;
  remoteTrackIds: string[];
};

export type ReceiveProbeEvidence = {
  broadcastId: string;
  roomName: string;
  startedAt: string;
  endedAt: string | null;
  samples: ReceiveProbeSample[];
  trackStartedEvents: number;
  decodedVideo: boolean;
  decodedAudio: boolean;
  exportVersion: 1;
};

const MIN_VIDEO_TIME_DELTA_SEC = 0.05;
const MIN_AUDIO_RMS = 0.01;

export function evaluateReceiveProbeEvidence(
  evidence: Omit<
    ReceiveProbeEvidence,
    "decodedVideo" | "decodedAudio" | "exportVersion"
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

  return {
    ...evidence,
    exportVersion: 1,
    decodedVideo,
    decodedAudio,
  };
}

export function receiveProbePass(evidence: ReceiveProbeEvidence): boolean {
  return evidence.decodedVideo || evidence.decodedAudio;
}

export function serializeReceiveProbeEvidence(
  evidence: ReceiveProbeEvidence
): string {
  return JSON.stringify(evidence, null, 2);
}
