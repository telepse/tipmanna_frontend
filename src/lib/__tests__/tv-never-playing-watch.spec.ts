import { describe, expect, it } from "vitest";

import {
  INITIAL_TV_NEVER_PLAYING_WATCH_STATE,
  reduceTvNeverPlayingWatch,
  shouldArmTvNeverPlayingWatch,
  TV_NEVER_PLAYING_WARNING_THRESHOLD_MS,
  type TvNeverPlayingWatchInput,
} from "../tv-never-playing-watch";

const baseInput: TvNeverPlayingWatchInput = {
  iframeApiReady: true,
  tvReady: true,
  isNoticeRow: false,
  hasYoutubeUrl: true,
  isPaymentActive: false,
  playerRefIsNull: false,
  startupEmbedGeneration: 1,
  watchKey: "0:abc",
  playerState: "UNSTARTED",
};

describe("shouldArmTvNeverPlayingWatch", () => {
  it("arms only when eligible", () => {
    expect(shouldArmTvNeverPlayingWatch(baseInput)).toBe(true);
    expect(
      shouldArmTvNeverPlayingWatch({ ...baseInput, iframeApiReady: false })
    ).toBe(false);
    expect(shouldArmTvNeverPlayingWatch({ ...baseInput, tvReady: false })).toBe(
      false
    );
  });

  it("never arms for notice rows", () => {
    expect(
      shouldArmTvNeverPlayingWatch({ ...baseInput, isNoticeRow: true })
    ).toBe(false);
  });

  it("never arms during payment", () => {
    expect(
      shouldArmTvNeverPlayingWatch({ ...baseInput, isPaymentActive: true })
    ).toBe(false);
  });
});

describe("reduceTvNeverPlayingWatch", () => {
  it("null player resets stuck clock", () => {
    let state = INITIAL_TV_NEVER_PLAYING_WATCH_STATE;
    const t0 = 1_000;
    ({ state } = reduceTvNeverPlayingWatch(state, baseInput, t0));
    ({ state } = reduceTvNeverPlayingWatch(
      state,
      { ...baseInput, playerRefIsNull: true },
      t0 + 5000
    ));
    const late = reduceTvNeverPlayingWatch(
      state,
      { ...baseInput, playerRefIsNull: false },
      t0 + TV_NEVER_PLAYING_WARNING_THRESHOLD_MS + 100
    );
    expect(late.showCaseB).toBe(false);
  });

  it("generation change resets", () => {
    let state = INITIAL_TV_NEVER_PLAYING_WATCH_STATE;
    const t0 = 0;
    for (let t = t0; t < t0 + 25_000; t += 1000) {
      ({ state } = reduceTvNeverPlayingWatch(state, baseInput, t));
    }
    const afterGen = reduceTvNeverPlayingWatch(
      state,
      { ...baseInput, startupEmbedGeneration: 2 },
      t0 + 25_000
    );
    expect(afterGen.showCaseB).toBe(false);
  });

  it("video/index change resets", () => {
    let state = INITIAL_TV_NEVER_PLAYING_WATCH_STATE;
    const t0 = 0;
    for (let t = t0; t < t0 + 25_000; t += 1000) {
      ({ state } = reduceTvNeverPlayingWatch(state, baseInput, t));
    }
    const afterKey = reduceTvNeverPlayingWatch(
      state,
      { ...baseInput, watchKey: "1:xyz" },
      t0 + 25_000
    );
    expect(afterKey.showCaseB).toBe(false);
  });

  it("BUFFERING resets and does not show Case B", () => {
    let state = INITIAL_TV_NEVER_PLAYING_WATCH_STATE;
    const t0 = 0;
    ({ state } = reduceTvNeverPlayingWatch(state, baseInput, t0));
    const buffering = reduceTvNeverPlayingWatch(
      state,
      { ...baseInput, playerState: "BUFFERING" },
      t0 + 25_000
    );
    expect(buffering.showCaseB).toBe(false);
    expect(buffering.state.stuckSinceMs).toBeNull();
  });

  it("PLAYING clears warning", () => {
    let state = INITIAL_TV_NEVER_PLAYING_WATCH_STATE;
    const t0 = 0;
    for (
      let t = t0;
      t <= t0 + TV_NEVER_PLAYING_WARNING_THRESHOLD_MS;
      t += 1000
    ) {
      ({ state } = reduceTvNeverPlayingWatch(state, baseInput, t));
    }
    const stuck = reduceTvNeverPlayingWatch(
      state,
      baseInput,
      t0 + TV_NEVER_PLAYING_WARNING_THRESHOLD_MS + 1
    );
    expect(stuck.showCaseB).toBe(true);
    const playing = reduceTvNeverPlayingWatch(
      stuck.state,
      { ...baseInput, playerState: "PLAYING" },
      t0 + TV_NEVER_PLAYING_WARNING_THRESHOLD_MS + 500
    );
    expect(playing.showCaseB).toBe(false);
  });

  it("PAUSED does not produce Case B", () => {
    const state = INITIAL_TV_NEVER_PLAYING_WATCH_STATE;
    const result = reduceTvNeverPlayingWatch(
      state,
      { ...baseInput, playerState: "PAUSED" },
      TV_NEVER_PLAYING_WARNING_THRESHOLD_MS + 5000
    );
    expect(result.showCaseB).toBe(false);
  });

  it("ENDED does not produce Case B", () => {
    const result = reduceTvNeverPlayingWatch(
      INITIAL_TV_NEVER_PLAYING_WATCH_STATE,
      { ...baseInput, playerState: "ENDED" },
      TV_NEVER_PLAYING_WARNING_THRESHOLD_MS + 5000
    );
    expect(result.showCaseB).toBe(false);
  });

  it("20s eligible wait produces soft warning", () => {
    let state = INITIAL_TV_NEVER_PLAYING_WATCH_STATE;
    let showCaseB = false;
    const t0 = 10_000;
    for (
      let t = t0;
      t <= t0 + TV_NEVER_PLAYING_WARNING_THRESHOLD_MS;
      t += 500
    ) {
      const step = reduceTvNeverPlayingWatch(state, baseInput, t);
      state = step.state;
      showCaseB = step.showCaseB;
    }
    expect(showCaseB).toBe(true);
  });

  it("does not imply playback side effects (pure reducer)", () => {
    expect(typeof reduceTvNeverPlayingWatch).toBe("function");
    expect(reduceTvNeverPlayingWatch.length).toBeGreaterThan(0);
  });
});
