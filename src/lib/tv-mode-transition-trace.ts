import { isTvDebugEnabled, tvTrace } from "@/lib/tvDebugLog";
import { hashShortId } from "@/lib/tv-startup-trace";

export type TvModeTransitionTraceInput = {
  previousReactMode: "GLOBAL" | "LOCAL";
  newReactMode: "GLOBAL" | "LOCAL";
  previousModeRef: "GLOBAL" | "LOCAL";
  newModeRef: "GLOBAL" | "LOCAL";
  source: string;
  action: string;
  currentScheduleIndex?: number;
  currentVideoId?: string | null;
  playerTimeSeconds?: number | null;
  playerState?: string | null;
  goLiveGuardActive?: boolean;
  guardUntil?: number;
  causedByPlayerPause?: boolean;
  causedByPlayerSeek?: boolean;
  causedByPlayerLoad?: boolean;
  causedByPlayerReady?: boolean;
  causedByScheduleTransition?: boolean;
  selectorContextMode?: "GLOBAL" | "LOCAL";
  badgeMode?: "GLOBAL" | "LOCAL";
};

/** Debug-only unified mode mutation timeline (`?tvDebug=1`). */
export function emitModeTransitionTrace(
  input: TvModeTransitionTraceInput
): void {
  if (!isTvDebugEnabled()) return;
  tvTrace("navigation", "mode_transition_trace", {
    ...input,
    currentVideoIdHash: hashShortId(input.currentVideoId ?? null),
    guardMsRemaining:
      input.guardUntil != null
        ? Math.max(0, input.guardUntil - Date.now())
        : null,
  });
}
