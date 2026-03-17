// /* eslint-disable @typescript-eslint/no-explicit-any */
// import { AnimationHandle } from "@/types/animation.types";
// import { ANIMATION_DURATION } from "@/lib/animationContract";

import { AnimationHandle } from "@/types/animation.types";

// /**
//  * ✅ SAFE PAYMENT WRAPPER
//  * - DOES NOT start animation immediately
//  * - Only starts when queue executes it
//  */
// export function wrapPaymentAnimation(
//   factory: () => AnimationHandle & { start?: () => void }
// ): () => Promise<void> {
//   return async () => {
//     const startTime = performance.now();
//     const handle = factory();

//     if (handle.start) {
//       handle.start();
//     }

//     let warnedFirstFrame = false;

//     if (typeof window === "undefined") {
//       setTimeout(() => {
//         const meta = (handle as any).__meta;
//         if (!meta?.firstFrameAt && !warnedFirstFrame) {
//           warnedFirstFrame = true;
//           console.warn(
//             "[payment animation] no visual frame detected within 500ms",
//             handle
//           );
//         }
//       }, 500);
//     }

//     await handle.finished;

//     if (typeof window === "undefined") {
//       const elapsed = performance.now() - startTime;
//       if (elapsed < ANIMATION_DURATION.payment.min) {
//         console.warn("[payment animation] finished earlier than expected", {
//           elapsed,
//         });
//       }
//     }
//   };
// }

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
export const currentlyPlaying = new Set<string>();
