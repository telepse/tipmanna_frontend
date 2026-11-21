import { afterEach, describe, expect, it, vi } from "vitest";

import {
  applyAckAndGetRetry,
  drainPendingQueue,
  enqueueSdkEvents,
  resetQueueStateForTests,
  restoreUnacked,
} from "../queue";
import { flushSdkAnalytics } from "../transport";
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

describe("analytics-sdk queue + transport", () => {
  afterEach(() => {
    resetQueueStateForTests();
    vi.unstubAllGlobals();
  });

  it("restores queue when response is not ok", async () => {
    enqueueSdkEvents([ev("550e8400-e29b-41d4-a716-446655440001")]);
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    await flushSdkAnalytics({
      ctx: { sessionId: "s", surface: "channel_client" },
      auth: {},
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(drainPendingQueue()).toHaveLength(1);
  });

  it("applyAck drops accepted and duplicates; retries rejected only", () => {
    const batch = [
      ev("550e8400-e29b-41d4-a716-446655440001"),
      ev("550e8400-e29b-41d4-a716-446655440002"),
      ev("550e8400-e29b-41d4-a716-446655440003"),
    ];
    const retry = applyAckAndGetRetry(batch, {
      accepted: 1,
      duplicates: ["550e8400-e29b-41d4-a716-446655440002"],
      rejected: [{ index: 2, reason: "missing_or_invalid_eventUid" }],
    });
    expect(retry).toHaveLength(1);
    expect(retry[0].eventUid).toBe("550e8400-e29b-41d4-a716-446655440003");
  });

  it("flush applies ack and leaves only rejected in queue", async () => {
    const uids = [
      "550e8400-e29b-41d4-a716-446655440010",
      "550e8400-e29b-41d4-a716-446655440011",
    ];
    enqueueSdkEvents(uids.map(ev));
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        accepted: 1,
        duplicates: [],
        rejected: [{ index: 1, reason: "unknown_event" }],
      }),
    });
    await flushSdkAnalytics({
      ctx: { sessionId: "s", surface: "channel_client" },
      auth: {},
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const pending = drainPendingQueue();
    expect(pending).toHaveLength(1);
    expect(pending[0].eventUid).toBe(uids[1]);
  });

  it("restoreUnacked prepends failed batch", () => {
    enqueueSdkEvents([ev("550e8400-e29b-41d4-a716-446655440099")]);
    const drained = drainPendingQueue();
    restoreUnacked(drained);
    expect(drainPendingQueue()).toHaveLength(1);
  });
});
