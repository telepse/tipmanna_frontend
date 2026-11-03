import { describe, expect, it } from "vitest";

import {
  evaluateReceiveProbeEvidence,
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
    expect(receiveProbePass(evaluated)).toBe(false);
  });

  it("passes when video currentTime advances across samples", () => {
    const evaluated = evaluateReceiveProbeEvidence({
      broadcastId: "bc-1",
      roomName: "tm-room",
      startedAt: new Date().toISOString(),
      endedAt: null,
      trackStartedEvents: 1,
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
    expect(receiveProbePass(evaluated)).toBe(true);
  });
});
