import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { drainPendingQueue, resetQueueStateForTests } from "../queue";
import {
  channelClientPlaybackComplete,
  channelClientPlaybackOnPlayStateChange,
  channelClientPlaybackOnVideoLoaded,
  resetChannelClientPlaybackForTests,
} from "../channel-client-playback";
import { resetActivationStateForTests } from "../activation";

describe("channel-client-playback", () => {
  beforeEach(() => {
    let uidN = 0;
    vi.stubGlobal("crypto", {
      randomUUID: () => {
        uidN += 1;
        return `550e8400-e29b-41d4-a716-44665544000${uidN}`;
      },
    });
    const sessionStore = new Map<string, string>();
    vi.stubGlobal("sessionStorage", {
      getItem: (k: string) => sessionStore.get(k) ?? null,
      setItem: (k: string, v: string) => {
        sessionStore.set(k, v);
      },
      removeItem: (k: string) => {
        sessionStore.delete(k);
      },
    });
    vi.stubGlobal("window", {
      matchMedia: () => ({ matches: false }),
    });
  });

  afterEach(() => {
    resetChannelClientPlaybackForTests();
    resetActivationStateForTests();
    resetQueueStateForTests();
    vi.unstubAllGlobals();
  });

  it("emits one encounter per activation on play after load", () => {
    channelClientPlaybackOnVideoLoaded({
      eventId: "ev1",
      videoChannelId: "ch1",
      communityId: null,
      scheduleIndex: 0,
      isPlaying: false,
    });
    channelClientPlaybackOnPlayStateChange(true, 0);
    channelClientPlaybackOnPlayStateChange(true, 0);
    const q = drainPendingQueue();
    const encounters = q.filter(e => e.event === "video_encounter");
    expect(encounters).toHaveLength(1);
  });

  it("after complete, emits encounter again on next play", () => {
    channelClientPlaybackOnVideoLoaded({
      eventId: "ev1",
      videoChannelId: "ch1",
      communityId: null,
      scheduleIndex: 0,
      isPlaying: true,
    });
    expect(drainPendingQueue().length).toBeGreaterThan(0);
    channelClientPlaybackComplete();
    channelClientPlaybackOnVideoLoaded({
      eventId: "ev1",
      videoChannelId: "ch1",
      communityId: null,
      scheduleIndex: 0,
      isPlaying: false,
    });
    channelClientPlaybackOnPlayStateChange(true, 0);
    const second = drainPendingQueue();
    expect(second.some(e => e.event === "video_encounter")).toBe(true);
  });
});
