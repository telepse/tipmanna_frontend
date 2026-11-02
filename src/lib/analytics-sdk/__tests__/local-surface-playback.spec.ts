import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { drainPendingQueue, resetQueueStateForTests } from "../queue";
import {
  resetTiplinkPlaybackForTests,
  tiplinkPlaybackOnEncounter,
} from "../tiplink-playback";
import { resetActivationStateForTests } from "../activation";

describe("local-surface-playback (tiplink)", () => {
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
    resetTiplinkPlaybackForTests();
    resetActivationStateForTests();
    resetQueueStateForTests();
    vi.unstubAllGlobals();
  });

  it("emits video_encounter on load when not yet playing (acceptance tiplink path)", () => {
    tiplinkPlaybackOnEncounter({
      eventId: "ev1",
      videoChannelId: "ch1",
      communityId: null,
      encounterItemId: "slug-enc",
      isPlaying: false,
    });
    const q = drainPendingQueue();
    expect(q.some(e => e.event === "video_encounter")).toBe(true);
    expect(q.some(e => e.event === "video_start")).toBe(false);
  });
});
