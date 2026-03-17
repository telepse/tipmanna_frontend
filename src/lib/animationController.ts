import { AnimationHandle } from "@/types/animation.types";

interface ActiveAnimation {
  cleanup?: () => void;
  rafId?: number;
  timeoutIds?: number[];
}

let currentAnimation: ActiveAnimation | null = null;

export function stopCurrentAnimation() {
  if (!currentAnimation) return;

  currentAnimation.cleanup?.();

  if (currentAnimation.rafId) {
    cancelAnimationFrame(currentAnimation.rafId);
  }

  if (currentAnimation.timeoutIds) {
    currentAnimation.timeoutIds.forEach(clearTimeout);
  }

  currentAnimation = null;
}

export function registerAnimation(animation: ActiveAnimation) {
  stopCurrentAnimation(); // always stop previous
  currentAnimation = animation;
}

let currentPreviewHandles: AnimationHandle[] = [];

export function stopCurrentPreviews() {
  currentPreviewHandles.forEach(handle => handle.stop?.());
  currentPreviewHandles = [];
}
