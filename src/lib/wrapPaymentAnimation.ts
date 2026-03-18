// /* eslint-disable @typescript-eslint/no-explicit-any */
import { AnimationHandle } from "@/types/animation.types";

export function wrapPaymentAnimation(
  factory: () => AnimationHandle
): () => Promise<void> {
  return async () => {
    const handle = factory();

    if (handle.start) {
      handle.start();
    }

    try {
      await handle.finished;
    } catch {
      // swallow to protect queue
    }
  };
}

export const playedAnimations = new Set<string>();
