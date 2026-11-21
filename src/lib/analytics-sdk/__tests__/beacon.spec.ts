import { afterEach, describe, expect, it, vi } from "vitest";

import {
  drainPendingQueue,
  enqueueSdkEvents,
  peekPendingQueue,
  resetQueueStateForTests,
} from "../queue";
import { flushSdkAnalytics, sendSdkBeacon } from "../transport";
import type { SdkPlaybackEventV2 } from "../types";

function ev(uid: string): SdkPlaybackEventV2 {
  return {
    event: "video_start",
    ts: 1,
    itemId: "c1",
    mode: "LOCAL",
    scheduleIndex: 0,
    eventUid: uid,
  };
}

describe("sendSdkBeacon keep-until-ack", () => {
  afterEach(() => {
    resetQueueStateForTests();
    vi.unstubAllGlobals();
  });

  it("does not drain queue on successful beacon", () => {
    enqueueSdkEvents([ev("550e8400-e29b-41d4-a716-446655440001")]);
    vi.stubGlobal("navigator", {
      sendBeacon: vi.fn().mockReturnValue(true),
    });
    const ok = sendSdkBeacon({
      ctx: { sessionId: "s", surface: "channel_client" },
      auth: {},
    });
    expect(ok).toBe(true);
    expect(peekPendingQueue()).toHaveLength(1);
    expect(peekPendingQueue()[0].beaconedAt).toBeTypeOf("number");
  });

  it("flush after beacon drops acked UIDs", async () => {
    const uid = "550e8400-e29b-41d4-a716-446655440002";
    enqueueSdkEvents([ev(uid)]);
    vi.stubGlobal("navigator", {
      sendBeacon: vi.fn().mockReturnValue(true),
    });
    sendSdkBeacon({
      ctx: { sessionId: "s", surface: "channel_client" },
      auth: {},
    });
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        accepted: 1,
        duplicates: [],
        rejected: [],
      }),
    });
    await flushSdkAnalytics({
      ctx: { sessionId: "s", surface: "channel_client" },
      auth: {},
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(drainPendingQueue()).toHaveLength(0);
  });
});
