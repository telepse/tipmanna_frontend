import { describe, expect, it } from "vitest";

import {
  evaluateReceiveProbeEvidence,
  receiveProbeFullAvAcceptance,
  receiveProbeMediumProven,
  receiveProbePass,
  type ReceiveProbeSample,
} from "@/lib/daily-receive-probe-evidence";

function sample(partial: Partial<ReceiveProbeSample>): ReceiveProbeSample {
  return {
    at: new Date().toISOString(),
    videoCurrentTimeSec: null,
    videoWidth: null,
    videoHeight: null,
    audioLevelRms: null,
    remoteTrackIds: [],
    ...partial,
  };
}

const base = {
  broadcastId: "bc-1",
  roomName: "tm-room",
  startedAt: new Date().toISOString(),
  endedAt: null,
  trackStartedEvents: 2,
  measurementMode: "real_daily" as const,
  audioAnalyserConnected: true,
  audioContextState: "running",
};

describe("daily receive probe evidence", () => {
  it("track-started alone does not pass without decode motion or audio", () => {
    const evaluated = evaluateReceiveProbeEvidence({
      ...base,
      samples: [
        sample({ videoCurrentTimeSec: 0, audioLevelRms: 0, remoteTrackIds: ["v1"] }),
      ],
    });
    expect(evaluated.decodedVideo).toBe(false);
    expect(evaluated.decodedAudio).toBe(false);
    expect(evaluated.videoReception).toBe("UNKNOWN");
    expect(evaluated.audioReception).toBe("UNKNOWN");
    expect(evaluated.audioStatus).toBe("insufficient_samples");
    expect(receiveProbePass(evaluated)).toBe(false);
  });

  it("video decode proves video reception only", () => {
    const evaluated = evaluateReceiveProbeEvidence({
      ...base,
      audioAnalyserConnected: false,
      audioContextState: "suspended",
      samples: [
        sample({ videoCurrentTimeSec: 1.0, remoteTrackIds: ["v:p1"] }),
        sample({ videoCurrentTimeSec: 1.2, remoteTrackIds: ["v:p1"] }),
      ],
    });
    expect(evaluated.videoReception).toBe("PROVEN");
    expect(evaluated.audioReception).toBe("NOT_PROVEN");
    expect(evaluated.audioStatus).toBe("no_remote_audio_track");
    expect(receiveProbeMediumProven(evaluated, "video")).toBe(true);
    expect(receiveProbeFullAvAcceptance(evaluated)).toBe(false);
  });

  it("steady tone above threshold proves audio (no variance required)", () => {
    const evaluated = evaluateReceiveProbeEvidence({
      ...base,
      samples: [
        sample({ videoFramesDecoded: 10, audioLevelRms: 0.21, remoteAudioTrackPresent: true }),
        sample({ videoFramesDecoded: 40, audioLevelRms: 0.21, remoteAudioTrackPresent: true }),
      ],
    });
    expect(evaluated.audioStatus).toBe("signal_present");
    expect(evaluated.audioReception).toBe("PROVEN");
    expect(evaluated.videoStatus).toBe("frames_advancing");
    expect(receiveProbeFullAvAcceptance(evaluated)).toBe(true);
    expect(evaluated.evidenceScope).toBe("real_daily_subscriber");
  });

  it("silent received track is UNKNOWN, not a transport failure", () => {
    const evaluated = evaluateReceiveProbeEvidence({
      ...base,
      samples: [
        sample({ audioLevelRms: 0, remoteAudioTrackPresent: true }),
        sample({ audioLevelRms: 0.001, remoteAudioTrackPresent: true }),
      ],
    });
    expect(evaluated.audioStatus).toBe("silent_track");
    expect(evaluated.audioReception).toBe("UNKNOWN");
    expect(evaluated.audioMeasurementNote).toContain("not_transport_failure");
  });

  it("suspended AudioContext yields not-measured, not silence", () => {
    const evaluated = evaluateReceiveProbeEvidence({
      ...base,
      audioContextState: "suspended",
      samples: [
        sample({ audioLevelRms: null, audioContextState: "suspended", remoteAudioTrackPresent: true }),
        sample({ audioLevelRms: null, audioContextState: "suspended", remoteAudioTrackPresent: true }),
      ],
    });
    expect(evaluated.audioStatus).toBe("audio_context_not_running");
    expect(evaluated.audioReception).toBe("UNKNOWN");
  });

  it("frozen decoded-frame counter is NOT_PROVEN video", () => {
    const evaluated = evaluateReceiveProbeEvidence({
      ...base,
      samples: [
        sample({ videoFramesDecoded: 12, videoCurrentTimeSec: 1 }),
        sample({ videoFramesDecoded: 12, videoCurrentTimeSec: 3 }),
      ],
    });
    expect(evaluated.videoStatus).toBe("frames_not_advancing");
    expect(evaluated.videoReception).toBe("NOT_PROVEN");
  });

  it("mock evidence is labelled as synthetic, never Daily proof", () => {
    const evaluated = evaluateReceiveProbeEvidence({
      ...base,
      measurementMode: "mock_synthetic",
      samples: [
        sample({ audioLevelRms: 0.2, remoteAudioTrackPresent: true }),
        sample({ audioLevelRms: 0.2, remoteAudioTrackPresent: true }),
      ],
    });
    expect(evaluated.evidenceScope).toBe("synthetic_local_media_not_daily_proof");
    expect(evaluated.exportVersion).toBe(3);
  });
});
