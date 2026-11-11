import { describe, expect, it } from "vitest";

import {
  resolveExploreReelPlayerAudioProps,
  resolveExploreReelTapAction,
  shouldDeferProgrammaticUnmute,
  shouldShowExploreTapForSound,
} from "../explore-reel-audio-policy";

describe("shouldDeferProgrammaticUnmute", () => {
  it("defers on iPhone Safari", () => {
    expect(
      shouldDeferProgrammaticUnmute(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
      )
    ).toBe(true);
  });

  it("defers on iPhone Chrome (CriOS)", () => {
    expect(
      shouldDeferProgrammaticUnmute(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1"
      )
    ).toBe(true);
  });

  it("defers on iPad desktop UA with ontouchend", () => {
    expect(
      shouldDeferProgrammaticUnmute(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
        { ontouchendInDocument: true }
      )
    ).toBe(true);
  });

  it("does not defer on desktop Mac without ontouchend", () => {
    expect(
      shouldDeferProgrammaticUnmute(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
        { ontouchendInDocument: false, maxTouchPoints: 5 }
      )
    ).toBe(false);
  });

  it("does not defer on desktop Chrome", () => {
    expect(
      shouldDeferProgrammaticUnmute(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        { ontouchendInDocument: false }
      )
    ).toBe(false);
  });

  it("does not defer on Android Chrome", () => {
    expect(
      shouldDeferProgrammaticUnmute(
        "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
        { ontouchendInDocument: false }
      )
    ).toBe(false);
  });
});

describe("resolveExploreReelPlayerAudioProps", () => {
  it("non-iOS + wants sound restores programmatically", () => {
    expect(
      resolveExploreReelPlayerAudioProps({ defer: false, wantsSound: true })
    ).toEqual({
      initialMuted: false,
      restoreSessionSoundOnProgrammaticPlay: true,
    });
  });

  it("non-iOS + muted pref starts muted with restore on", () => {
    expect(
      resolveExploreReelPlayerAudioProps({ defer: false, wantsSound: false })
    ).toEqual({
      initialMuted: true,
      restoreSessionSoundOnProgrammaticPlay: true,
    });
  });

  it("iOS defers restore even when wants sound", () => {
    expect(
      resolveExploreReelPlayerAudioProps({ defer: true, wantsSound: true })
    ).toEqual({
      initialMuted: true,
      restoreSessionSoundOnProgrammaticPlay: false,
    });
  });
});

describe("resolveExploreReelTapAction", () => {
  it("before PLAYING always play_and_unmute", () => {
    expect(
      resolveExploreReelTapAction({
        hasReachedPlaying: false,
        engagedThisReel: false,
        playerMuted: true,
      })
    ).toBe("play_and_unmute");
  });

  it("first tap on playing muted reel unmutes", () => {
    expect(
      resolveExploreReelTapAction({
        hasReachedPlaying: true,
        engagedThisReel: false,
        playerMuted: true,
      })
    ).toBe("unmute_and_engage");
  });

  it("after engage, muted still engaged toggles pause", () => {
    expect(
      resolveExploreReelTapAction({
        hasReachedPlaying: true,
        engagedThisReel: true,
        playerMuted: true,
      })
    ).toBe("toggle_pause");
  });

  it("otherwise toggles pause", () => {
    expect(
      resolveExploreReelTapAction({
        hasReachedPlaying: true,
        engagedThisReel: true,
        playerMuted: false,
      })
    ).toBe("toggle_pause");
  });
});

describe("shouldShowExploreTapForSound", () => {
  it("shows on iOS when playing muted with sound pref", () => {
    expect(
      shouldShowExploreTapForSound({
        defer: true,
        wantsSound: true,
        playerMuted: true,
        isPlaying: true,
        showTapToPlay: false,
      })
    ).toBe(true);
  });

  it("hides when tap-to-play wins", () => {
    expect(
      shouldShowExploreTapForSound({
        defer: true,
        wantsSound: true,
        playerMuted: true,
        isPlaying: false,
        showTapToPlay: true,
      })
    ).toBe(false);
  });

  it("hides on non-iOS defer false", () => {
    expect(
      shouldShowExploreTapForSound({
        defer: false,
        wantsSound: true,
        playerMuted: true,
        isPlaying: true,
        showTapToPlay: false,
      })
    ).toBe(false);
  });
});
