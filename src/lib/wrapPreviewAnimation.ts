import { AnimationHandle } from "@/types/animation.types";

/**
 * Ensures preview animations:
 * - auto-start when required
 * - return a clean AnimationHandle
 * - behave consistently across styles
 */
export function wrapPreviewAnimation(
  factory: () => AnimationHandle & { start?: () => void }
): AnimationHandle {
  const handle = factory();

  if ("start" in handle && typeof handle.start === "function") {
    handle.start();
  }

  return handle;
}
