import { AnimationHandle } from "@/types/animation.types";
import { ANIMATION_DURATION } from "@/lib/animationContract";
import {
  attachPreviewRewardLayers,
  detachPreviewRewardLayers,
} from "@/lib/reward-overlays/mount-web-reward-layers";

/* ───────────── Constants ───────────── */

const { max: MAX_PREVIEW } = ANIMATION_DURATION.preview;

/* ───────────── State (PREVIEW ONLY) ───────────── */

let activePreview: AnimationHandle | null = null;
let killTimer: number | null = null;

/* ───────────── Internal Helpers ───────────── */

function clearTimers() {
  if (killTimer !== null) {
    clearTimeout(killTimer);
    killTimer = null;
  }
}

function stopActivePreview() {
  clearTimers();
  detachPreviewRewardLayers();
  activePreview?.stop();
  activePreview = null;
}

export type PreviewRewardOptions = {
  rewardTurbo?: boolean;
  rewardGalaxy?: boolean;
  drawerTintRoot?: HTMLElement | null;
};

export function startPreview(
  factory: () => AnimationHandle,
  reward?: PreviewRewardOptions
): AnimationHandle | null {
  stopActivePreview();

  activePreview = factory();
  if (activePreview.start) {
    activePreview.start();
  }

  if (reward?.rewardTurbo || reward?.rewardGalaxy) {
    attachPreviewRewardLayers({
      turbo: !!reward.rewardTurbo,
      galaxy: !!reward.rewardGalaxy,
      durationMs: MAX_PREVIEW,
      serverTs: Date.now(),
      drawerTintRoot: reward.drawerTintRoot ?? null,
    });
  }

  killTimer = window.setTimeout(() => {
    stopActivePreview();
  }, MAX_PREVIEW);

  return activePreview;
}

/**
 * Stops the current preview (if any).
 */
export function stopPreview() {
  stopActivePreview();
}
