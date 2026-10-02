import { describe, expect, it } from "vitest";

import {
  beginGoLiveTransition,
  clearGoLiveTransition,
  evaluateGoLiveTransitionCompletion,
  inactiveGoLiveTransition,
  isOrchestratedGlobalLivePlayback,
  shouldApplyGoLiveTransitionCompletion,
  shouldSuppressPlayerIntentForGoLiveTransition,
  stampGoLiveTransitionGlobalLiveIntentSeq,
  updateGoLiveTransitionResolvedTarget,
} from "@/lib/tv-go-live-transition";

const LIVE_A = "live-video-a";

const LIVE_B = "live-video-b";

const LOCAL_ONLY = "local-only-video";

function armGoLive(input: {
  resolvedLiveVideoId?: string | null;

  globalLiveIntentSeq?: number;

  nowMs?: number;
}) {
  let t = beginGoLiveTransition(inactiveGoLiveTransition(), {
    resolvedLiveVideoId: input.resolvedLiveVideoId ?? LIVE_A,

    nowMs: input.nowMs,
  });

  t = stampGoLiveTransitionGlobalLiveIntentSeq(
    t,

    input.globalLiveIntentSeq ?? 1
  );

  return t;
}

function tryCompleteTransition(input: {
  transition: ReturnType<typeof armGoLive>;

  orchestratedVideoId: string | null;

  liveVideoIdNow: string | null;

  playerState: string | null;

  currentGlobalLiveIntentSeq: number;

  modeGlobal?: boolean;
}) {
  const capturedGeneration = input.transition.generation;

  const capturedGlobalLiveIntentSeq = input.transition.globalLiveIntentSeq;

  const result = evaluateGoLiveTransitionCompletion({
    transition: input.transition,

    modeGlobal: input.modeGlobal ?? true,

    orchestratedVideoId: input.orchestratedVideoId,

    liveVideoIdNow: input.liveVideoIdNow,

    playerState: input.playerState,

    currentGlobalLiveIntentSeq: input.currentGlobalLiveIntentSeq,
  });

  if (!result.complete)
    return { completed: false as const, transition: input.transition };

  const apply = shouldApplyGoLiveTransitionCompletion({
    capturedGeneration,

    capturedGlobalLiveIntentSeq,

    currentTransition: input.transition,
  });

  if (!apply)
    return { completed: false as const, transition: input.transition };

  return {
    completed: true as const,

    transition: clearGoLiveTransition(input.transition),
  };
}

describe("tv-go-live-transition", () => {
  it("suppresses pause/seek while Go Live transition is active in GLOBAL", () => {
    const t = armGoLive({});

    expect(
      shouldSuppressPlayerIntentForGoLiveTransition({
        transition: t,

        mode: "GLOBAL",
      })
    ).toBe(true);

    expect(
      shouldSuppressPlayerIntentForGoLiveTransition({
        transition: t,

        mode: "LOCAL",
      })
    ).toBe(false);
  });

  it("A — pending Go Live (not ready): flush updates target; PLAYING completes", () => {
    let t = armGoLive({ resolvedLiveVideoId: LIVE_A, globalLiveIntentSeq: 3 });

    expect(
      evaluateGoLiveTransitionCompletion({
        transition: t,

        modeGlobal: true,

        orchestratedVideoId: LOCAL_ONLY,

        liveVideoIdNow: LIVE_A,

        playerState: "PLAYING",

        currentGlobalLiveIntentSeq: 3,
      }).complete
    ).toBe(false);

    t = updateGoLiveTransitionResolvedTarget(t, LIVE_A);

    const done = tryCompleteTransition({
      transition: t,

      orchestratedVideoId: LIVE_A,

      liveVideoIdNow: LIVE_A,

      playerState: "PLAYING",

      currentGlobalLiveIntentSeq: 3,
    });

    expect(done.completed).toBe(true);

    expect(done.transition.active).toBe(false);
  });

  it("B — schedule advances A→B while settling: PLAYING on B completes without original index", () => {
    let t = armGoLive({ resolvedLiveVideoId: LIVE_A, globalLiveIntentSeq: 2 });

    t = updateGoLiveTransitionResolvedTarget(t, LIVE_B);

    const done = tryCompleteTransition({
      transition: t,

      orchestratedVideoId: LIVE_B,

      liveVideoIdNow: LIVE_B,

      playerState: "PLAYING",

      currentGlobalLiveIntentSeq: 2,
    });

    expect(done.completed).toBe(true);
  });

  it("C — already PLAYING valid GLOBAL target completes without a new PLAYING event", () => {
    const t = armGoLive({
      resolvedLiveVideoId: LIVE_A,
      globalLiveIntentSeq: 5,
    });

    const done = tryCompleteTransition({
      transition: t,

      orchestratedVideoId: LIVE_A,

      liveVideoIdNow: LIVE_A,

      playerState: "PLAYING",

      currentGlobalLiveIntentSeq: 5,
    });

    expect(done.completed).toBe(true);
  });

  it("D — programmatic pause during transition: suppression stays on (GLOBAL)", () => {
    const t = armGoLive({});

    expect(
      shouldSuppressPlayerIntentForGoLiveTransition({
        transition: t,
        mode: "GLOBAL",
      })
    ).toBe(true);

    expect(
      evaluateGoLiveTransitionCompletion({
        transition: t,

        modeGlobal: true,

        orchestratedVideoId: LIVE_A,

        liveVideoIdNow: LIVE_A,

        playerState: "PAUSED",

        currentGlobalLiveIntentSeq: t.globalLiveIntentSeq,
      }).complete
    ).toBe(false);
  });

  it("E — programmatic seek during transition: suppression stays on (GLOBAL)", () => {
    const t = armGoLive({});

    expect(
      shouldSuppressPlayerIntentForGoLiveTransition({
        transition: t,
        mode: "GLOBAL",
      })
    ).toBe(true);
  });

  it("F — genuine pause after transition completion is not suppressed", () => {
    const cleared = clearGoLiveTransition(armGoLive({}));

    expect(
      shouldSuppressPlayerIntentForGoLiveTransition({
        transition: cleared,

        mode: "GLOBAL",
      })
    ).toBe(false);
  });

  it("G — genuine seek after transition completion is not suppressed", () => {
    const cleared = clearGoLiveTransition(armGoLive({}));

    expect(
      shouldSuppressPlayerIntentForGoLiveTransition({
        transition: cleared,

        mode: "GLOBAL",
      })
    ).toBe(false);
  });

  it("H — stale generation cannot complete a newer Go Live transition", () => {
    const older = armGoLive({ globalLiveIntentSeq: 1 });

    const newer = beginGoLiveTransition(older, { resolvedLiveVideoId: LIVE_B });

    const stampedNewer = stampGoLiveTransitionGlobalLiveIntentSeq(newer, 2);

    const staleAttempt = evaluateGoLiveTransitionCompletion({
      transition: older,

      modeGlobal: true,

      orchestratedVideoId: LIVE_A,

      liveVideoIdNow: LIVE_A,

      playerState: "PLAYING",

      currentGlobalLiveIntentSeq: 1,
    });

    expect(staleAttempt.complete).toBe(true);

    const applyOnNewer = shouldApplyGoLiveTransitionCompletion({
      capturedGeneration: older.generation,

      capturedGlobalLiveIntentSeq: older.globalLiveIntentSeq,

      currentTransition: stampedNewer,
    });

    expect(applyOnNewer).toBe(false);
  });

  it("I — error/cancel clears transition; clear preserves generation", () => {
    const t = armGoLive({});

    const cleared = clearGoLiveTransition(t);

    expect(cleared.active).toBe(false);

    expect(cleared.generation).toBe(t.generation);

    expect(
      evaluateGoLiveTransitionCompletion({
        transition: cleared,

        modeGlobal: true,

        orchestratedVideoId: LIVE_A,

        liveVideoIdNow: LIVE_A,

        playerState: "PLAYING",

        currentGlobalLiveIntentSeq: 1,
      }).complete
    ).toBe(false);
  });

  it("J — repeated LOCAL→GLOBAL cycles do not leave transition active", () => {
    let ref = inactiveGoLiveTransition();

    for (let i = 0; i < 4; i++) {
      ref = armGoLive({
        resolvedLiveVideoId: i % 2 === 0 ? LIVE_A : LIVE_B,

        globalLiveIntentSeq: i + 1,
      });

      const done = tryCompleteTransition({
        transition: ref,

        orchestratedVideoId: ref.resolvedLiveVideoId,

        liveVideoIdNow: ref.resolvedLiveVideoId,

        playerState: "PLAYING",

        currentGlobalLiveIntentSeq: ref.globalLiveIntentSeq,
      });

      expect(done.completed).toBe(true);

      ref = done.transition;

      expect(ref.active).toBe(false);
    }
  });

  it("does not complete on unrelated LOCAL orchestration target", () => {
    const t = armGoLive({
      resolvedLiveVideoId: LIVE_A,
      globalLiveIntentSeq: 1,
    });

    expect(
      isOrchestratedGlobalLivePlayback({
        orchestratedVideoId: LOCAL_ONLY,

        resolvedLiveVideoId: LIVE_A,

        liveVideoIdNow: LIVE_A,
      })
    ).toBe(false);

    expect(
      evaluateGoLiveTransitionCompletion({
        transition: t,

        modeGlobal: true,

        orchestratedVideoId: LOCAL_ONLY,

        liveVideoIdNow: LIVE_A,

        playerState: "PLAYING",

        currentGlobalLiveIntentSeq: 1,
      }).complete
    ).toBe(false);
  });

  it("rejects completion when global live intent seq superseded", () => {
    const t = armGoLive({ globalLiveIntentSeq: 1 });

    expect(
      evaluateGoLiveTransitionCompletion({
        transition: t,

        modeGlobal: true,

        orchestratedVideoId: LIVE_A,

        liveVideoIdNow: LIVE_A,

        playerState: "PLAYING",

        currentGlobalLiveIntentSeq: 2,
      }).complete
    ).toBe(false);
  });
});
