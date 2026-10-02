/**
 * Semantic Go Live player-transition lifecycle (explicit Live TV / enterGlobalMode).
 * Suppresses pause/seek → LOCAL until stable GLOBAL playback on the live orchestration target.
 */

export type GoLiveTransitionState = {
  active: boolean;
  generation: number;
  startedAtMs: number;
  /** Latest known live video target for this Go Live operation (updated as orchestration settles). */
  resolvedLiveVideoId: string | null;
  /** Matches globalLiveIntentSeqRef when this Go Live was armed (after bump in enterGlobalMode). */
  globalLiveIntentSeq: number;
};

export function inactiveGoLiveTransition(
  generation = 0
): GoLiveTransitionState {
  return {
    active: false,
    generation,
    startedAtMs: 0,
    resolvedLiveVideoId: null,
    globalLiveIntentSeq: 0,
  };
}

export function beginGoLiveTransition(
  prev: GoLiveTransitionState,
  target: {
    resolvedLiveVideoId: string | null;
    nowMs?: number;
  }
): GoLiveTransitionState {
  const generation = prev.generation + 1;
  return {
    active: true,
    generation,
    startedAtMs: target.nowMs ?? Date.now(),
    resolvedLiveVideoId: target.resolvedLiveVideoId,
    globalLiveIntentSeq: 0,
  };
}

export function stampGoLiveTransitionGlobalLiveIntentSeq(
  transition: GoLiveTransitionState,
  globalLiveIntentSeq: number
): GoLiveTransitionState {
  if (!transition.active) return transition;
  return { ...transition, globalLiveIntentSeq };
}

export function updateGoLiveTransitionResolvedTarget(
  transition: GoLiveTransitionState,
  resolvedLiveVideoId: string | null
): GoLiveTransitionState {
  if (!transition.active || !resolvedLiveVideoId) return transition;
  return { ...transition, resolvedLiveVideoId };
}

export function clearGoLiveTransition(
  prev: GoLiveTransitionState
): GoLiveTransitionState {
  return inactiveGoLiveTransition(prev.generation);
}

export function shouldSuppressPlayerIntentForGoLiveTransition(input: {
  transition: GoLiveTransitionState;
  mode: "GLOBAL" | "LOCAL";
}): boolean {
  return input.mode === "GLOBAL" && input.transition.active;
}

/** True when a completion attempt captured an older Go Live generation or intent seq. */
export function shouldApplyGoLiveTransitionCompletion(input: {
  capturedGeneration: number;
  capturedGlobalLiveIntentSeq: number;
  currentTransition: GoLiveTransitionState;
}): boolean {
  const current = input.currentTransition;
  if (!current.active) return false;
  if (current.generation !== input.capturedGeneration) return false;
  if (current.globalLiveIntentSeq !== input.capturedGlobalLiveIntentSeq) {
    return false;
  }
  return true;
}

export function isOrchestratedGlobalLivePlayback(input: {
  orchestratedVideoId: string | null;
  resolvedLiveVideoId: string | null;
  liveVideoIdNow: string | null;
}): boolean {
  const { orchestratedVideoId, resolvedLiveVideoId, liveVideoIdNow } = input;
  if (!orchestratedVideoId) return false;
  if (resolvedLiveVideoId && orchestratedVideoId === resolvedLiveVideoId) {
    return true;
  }
  if (liveVideoIdNow && orchestratedVideoId === liveVideoIdNow) {
    return true;
  }
  return false;
}

export type GoLiveTransitionCompletionInput = {
  transition: GoLiveTransitionState;
  modeGlobal: boolean;
  orchestratedVideoId: string | null;
  liveVideoIdNow: string | null;
  playerState: string | null;
  currentGlobalLiveIntentSeq: number;
};

export type GoLiveTransitionCompletionResult =
  | { complete: false }
  | { complete: true; reason: "stable_global_playing" };

/**
 * Transition completes when GLOBAL mode, player is PLAYING on the current live orchestration
 * (not an unrelated LOCAL-only target), and intent seq still matches this Go Live operation.
 */
export function evaluateGoLiveTransitionCompletion(
  input: GoLiveTransitionCompletionInput
): GoLiveTransitionCompletionResult {
  if (!input.transition.active || !input.modeGlobal) {
    return { complete: false };
  }
  if (
    input.transition.globalLiveIntentSeq !== input.currentGlobalLiveIntentSeq
  ) {
    return { complete: false };
  }
  if (input.playerState !== "PLAYING") {
    return { complete: false };
  }
  if (
    !isOrchestratedGlobalLivePlayback({
      orchestratedVideoId: input.orchestratedVideoId,
      resolvedLiveVideoId: input.transition.resolvedLiveVideoId,
      liveVideoIdNow: input.liveVideoIdNow,
    })
  ) {
    return { complete: false };
  }
  return { complete: true, reason: "stable_global_playing" };
}
