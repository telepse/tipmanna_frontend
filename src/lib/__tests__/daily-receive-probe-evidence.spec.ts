import { describe, expect, it } from "vitest";

import {
  evaluateReceiveProbeEvidence,
  receiveProbeFullAvAcceptance,
  receiveProbeMediumProven,
  receiveProbePass,
} from "@/lib/daily-receive-probe-evidence";

describe("daily receive probe evidence", () => {
  it("track-started alone does not pass without decode motion or audio", () => {
    const evaluated = evaluateReceiveProbeEvidence({
      broadcastId: "bc-1",
      roomName: "tm-room",
      startedAt: new Date().toISOString(),
      endedAt: null,
      trackStartedEvents: 2,
      measurementMode: "real_daily",
      audioAnalyserConnected: true,
      audioContextState: "running",
      samples: [
        {
          at: new Date().toISOString(),
          videoCurrentTimeSec: 0,
          videoWidth: 640,
          videoHeight: 480,
          audioLevelRms: 0,
          remoteTrackIds: ["v1"],
        },
      ],
    });
    expect(evaluated.decodedVideo).toBe(false);
    expect(evaluated.decodedAudio).toBe(false);
    expect(evaluated.videoReception).toBe("UNKNOWN");
    expect(evaluated.audioReception).toBe("UNKNOWN");
    expect(receiveProbePass(evaluated)).toBe(false);
  });

  it("video decode proves video reception only", () => {
    const evaluated = evaluateReceiveProbeEvidence({
      broadcastId: "bc-1",
      roomName: "tm-room",
      startedAt: new Date().toISOString(),
      endedAt: null,
      trackStartedEvents: 1,
      measurementMode: "real_daily",
      audioAnalyserConnected: false,
      audioContextState: "suspended",
      samples: [
        {
          at: "t0",
          videoCurrentTimeSec: 1.0,
          videoWidth: 640,
          videoHeight: 480,
          audioLevelRms: null,
          remoteTrackIds: ["v1"],
        },
        {
          at: "t1",
          videoCurrentTimeSec: 1.2,
          videoWidth: 640,
          videoHeight: 480,
          audioLevelRms: null,
          remoteTrackIds: ["v1"],
        },
      ],
    });
    expect(evaluated.decodedVideo).toBe(true);
    expect(evaluated.videoReception).toBe("PROVEN");
    expect(evaluated.audioReception).toBe("UNKNOWN");
    expect(receiveProbeMediumProven(evaluated, "video")).toBe(true);
    expect(receiveProbeMediumProven(evaluated, "audio")).toBe(false);
    expect(receiveProbeFullAvAcceptance(evaluated)).toBe(false);
    expect(receiveProbePass(evaluated)).toBe(true);
  });

  it("full A+V acceptance requires both mediums proven", () => {
    const evaluated = evaluateReceiveProbeEvidence({
      broadcastId: "bc-1",
      roomName: "tm-room",
      startedAt: new Date().toISOString(),
      endedAt: null,
      trackStartedEvents: 2,
      measurementMode: "real_daily",
      audioAnalyserConnected: true,
      audioContextState: "running",
      samples: [
        {
          at: "t0",
          videoCurrentTimeSec: 1.0,
          videoWidth: 640,
          videoHeight: 480,
          audioLevelRms: 0.02,
          remoteTrackIds: ["v1", "a1"],
        },
        {
          at: "t1",
          videoCurrentTimeSec: 1.2,
          videoWidth: 640,
          videoHeight: 480,
          audioLevelRms: 0.08,
          remoteTrackIds: ["v1", "a1"],
        },
      ],
    });
    expect(evaluated.videoReception).toBe("PROVEN");
    expect(evaluated.audioReception).toBe("PROVEN");
    expect(receiveProbeFullAvAcceptance(evaluated)).toBe(true);
  });
});
