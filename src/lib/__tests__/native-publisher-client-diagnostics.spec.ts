import { describe, expect, it } from "vitest";

import { summarizeLocalPreviewStream } from "../native-publisher-client-diagnostics";

describe("native publisher client diagnostics", () => {
  it("counts live preview tracks separately from presence API semantics", () => {
    const stream = {
      getAudioTracks: () => [{ readyState: "live" as MediaStreamTrackState }],
      getVideoTracks: () => [{ readyState: "ended" as MediaStreamTrackState }],
    } as MediaStream;
    const summary = summarizeLocalPreviewStream(stream, true);
    expect(summary.audioLiveCount).toBe(1);
    expect(summary.videoLiveCount).toBe(0);
  });
});
