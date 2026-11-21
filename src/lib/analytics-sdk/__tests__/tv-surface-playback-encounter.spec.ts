import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../analytics-session", () => ({
  getAnalyticsSessionId: () => "sess-enc",
}));

vi.mock("../activation", () => ({
  getOrCreateActivationId: () => "act-1",
  markActivationEnded: vi.fn(),
}));

vi.mock("../event-uid", () => ({
  mintEventUid: () => "uid-1",
}));

const enqueueSdkEvents = vi.fn();
vi.mock("../queue", () => ({
  enqueueSdkEvents: (...args: unknown[]) => enqueueSdkEvents(...args),
}));

import {
  resetTvSurfacePlaybackForTests,
  tvSurfacePlaybackFor,
} from "../tv-surface-playback";

describe("tv-surface-playback encounter itemId", () => {
  beforeEach(() => {
    resetTvSurfacePlaybackForTests();
    enqueueSdkEvents.mockClear();
  });

  it("uses tv-surface-tv_fullscreen for fullscreen module", () => {
    const playback = tvSurfacePlaybackFor("tv_fullscreen");
    playback.onVideoReadyEncounter({
      eventId: "e1",
      videoChannelId: "ch1",
      scheduleItemId: "virt:1",
      communityId: null,
      scheduleIndex: 0,
      mode: "GLOBAL",
    });
    expect(enqueueSdkEvents).toHaveBeenCalledWith([
      expect.objectContaining({
        event: "video_encounter",
        itemId: "tv-surface-tv_fullscreen",
      }),
    ]);
  });

  it("uses tv-surface-tv_looper for looper module", () => {
    const playback = tvSurfacePlaybackFor("tv_looper");
    playback.onVideoReadyEncounter({
      eventId: "e1",
      videoChannelId: "ch1",
      scheduleItemId: "virt:1",
      communityId: null,
      scheduleIndex: 0,
      mode: "GLOBAL",
    });
    expect(enqueueSdkEvents).toHaveBeenCalledWith([
      expect.objectContaining({
        event: "video_encounter",
        itemId: "tv-surface-tv_looper",
      }),
    ]);
  });

  it("resetEncounterState allows a second encounter emit", () => {
    const playback = tvSurfacePlaybackFor("tv_fullscreen");
    playback.onVideoReadyEncounter({
      eventId: "e1",
      videoChannelId: "ch1",
      scheduleItemId: "virt:1",
      communityId: null,
      scheduleIndex: 0,
      mode: "GLOBAL",
    });
    playback.resetEncounterState();
    playback.onVideoReadyEncounter({
      eventId: "e1",
      videoChannelId: "ch1",
      scheduleItemId: "virt:1",
      communityId: null,
      scheduleIndex: 0,
      mode: "GLOBAL",
    });
    expect(enqueueSdkEvents).toHaveBeenCalledTimes(2);
  });
});
