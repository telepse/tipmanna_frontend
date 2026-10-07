/**
 * Pure orchestration for tip + program drawer session pause holds.
 * Mirrors tv-page-client-wrapper effect without touching playback internals.
 */
export type SessionDrawerOrchestrationInput = {
  sessionDrawerOpen: boolean;
  prevSessionDrawerOpen: boolean;
  isTipDrawerOpen: boolean;
  prevTipDrawerOpen: boolean;
  tipCount: number;
  prevTipCount: number;
};

export type SessionDrawerOrchestrationAction =
  | "prepareOnOpen"
  | "resumeOnClose"
  | "prepareTipSelection";

export function resolveSessionDrawerOrchestrationAction(
  input: SessionDrawerOrchestrationInput
): SessionDrawerOrchestrationAction | null {
  const {
    sessionDrawerOpen,
    prevSessionDrawerOpen,
    isTipDrawerOpen,
    prevTipDrawerOpen,
    tipCount,
    prevTipCount,
  } = input;

  if (sessionDrawerOpen && !prevSessionDrawerOpen) {
    return "prepareOnOpen";
  }

  if (!sessionDrawerOpen && prevSessionDrawerOpen) {
    return "resumeOnClose";
  }

  if (
    isTipDrawerOpen &&
    prevTipDrawerOpen &&
    tipCount > 0 &&
    prevTipCount === 0
  ) {
    return "prepareTipSelection";
  }

  return null;
}

export function shouldPrepareWithSelectedTips(
  action: SessionDrawerOrchestrationAction,
  tipCount: number
): boolean {
  if (action === "prepareTipSelection") return true;
  if (action === "prepareOnOpen") return tipCount > 0;
  return false;
}
