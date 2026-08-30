import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/payment-animation-trace", () => ({
  tracePaymentAnimation: vi.fn(),
  tracePaymentAnimationError: vi.fn(),
}));

import {
  clearPlaybackKeyState,
  commitPlaybackKey,
  getPlaybackKeyState,
  releasePlaybackKey,
  reservePlaybackKey,
} from "@/lib/playback-key-lifecycle";

describe("playback-key lifecycle", () => {
  beforeEach(() => {
    clearPlaybackKeyState();
  });

  it("reserves unseen keys atomically", () => {
    expect(getPlaybackKeyState("k1")).toBe("unseen");
    expect(reservePlaybackKey("k1")).toBe(true);
    expect(getPlaybackKeyState("k1")).toBe("reserved");
  });

  it("rejects duplicate reservation while reserved", () => {
    expect(reservePlaybackKey("k1")).toBe(true);
    expect(reservePlaybackKey("k1")).toBe(false);
    expect(getPlaybackKeyState("k1")).toBe("reserved");
  });

  it("commits reserved keys and blocks further reservation", () => {
    expect(reservePlaybackKey("k1")).toBe(true);
    expect(commitPlaybackKey("k1")).toBe(true);
    expect(getPlaybackKeyState("k1")).toBe("committed");
    expect(reservePlaybackKey("k1")).toBe(false);
  });

  it("releases reserved keys back to unseen", () => {
    expect(reservePlaybackKey("k1")).toBe(true);
    expect(releasePlaybackKey("k1", "queue_full")).toBe(true);
    expect(getPlaybackKeyState("k1")).toBe("unseen");
    expect(reservePlaybackKey("k1")).toBe(true);
  });

  it("never releases committed keys", () => {
    expect(reservePlaybackKey("k1")).toBe(true);
    expect(commitPlaybackKey("k1")).toBe(true);
    expect(releasePlaybackKey("k1", "flush")).toBe(false);
    expect(getPlaybackKeyState("k1")).toBe("committed");
  });
});
