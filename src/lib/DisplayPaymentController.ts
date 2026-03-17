// import { AnimationHandle } from "@/types/animation.types";
// import { animationExecutionRegistry } from "@/lib/animationExecutionRegistry";

// /**
//  * Queue-based payment animation executor for screen display
//  * Ensures:
//  * - Registry-enforced execution (prevents replay)
//  * - Sequential execution for multiple animations
//  */
// type PaymentAnimation = {
//   animationId: string;
//   executionKey: string;
//   surface: "payment-display";
//   factory: () => AnimationHandle & { start?: () => void };
// };

// const queue: PaymentAnimation[] = [];
// let isRunning = false;

// async function runNext() {
//   if (queue.length === 0) {
//     isRunning = false;
//     return;
//   }

//   const item = queue.shift()!;
//   const { animationId, executionKey, surface, factory } = item;

//   if (
//     !animationExecutionRegistry.trySpawn(animationId, surface, executionKey)
//   ) {
//     console.log(
//       "[DisplayPaymentController] animation blocked by registry",
//       executionKey
//     );
//     runNext();
//     return;
//   }

//   const handle = factory();
//   if (handle.start) handle.start();

//   try {
//     await handle.finished;
//   } catch (err) {
//     console.error("[DisplayPaymentController] animation failed", err);
//   }

//   runNext();
// }

// /**
//  * Enqueue a payment animation
//  */
// export function playDisplayPaymentAnimation(animation: PaymentAnimation) {
//   queue.push(animation);
//   if (!isRunning) {
//     isRunning = true;
//     runNext();
//   }
// }

// DisplayPaymentController.ts

import { AnimationHandle } from "@/types/animation.types";
import { animationExecutionRegistry } from "@/lib/animationExecutionRegistry";

type PaymentAnimation = {
  animationId: string;
  executionKey: string;
  surface: "payment-display" | "payment-event";
  factory: () => AnimationHandle;
};

const queue: PaymentAnimation[] = [];
let running = false;

/**
 * STRICTLY SEQUENTIAL EXECUTION
 */
async function runQueue() {
  if (running) return;
  running = true;

  while (queue.length > 0) {
    const item = queue.shift();
    if (!item) continue;

    const { animationId, executionKey, surface, factory } = item;

    const allowed = animationExecutionRegistry.trySpawn(
      animationId,
      surface,
      executionKey
    );

    if (!allowed) {
      continue;
    }

    try {
      const handle = factory();

      if (handle.start) {
        handle.start();
      }

      // 🔒 HARD GUARANTEE: always await finished
      await Promise.resolve(handle.finished);
    } catch (err) {
      console.error("[DisplayPaymentController] animation failed", err);
    }
  }

  running = false;
}

export function playDisplayPaymentAnimation(
  animationId: string,
  executionKey: string,
  surface: "payment-display" | "payment-event",
  factory: (mode: "payment") => AnimationHandle
) {
  if (
    !animationExecutionRegistry.trySpawn(animationId, surface, executionKey)
  ) {
    return;
  }

  const handle = factory("payment");

  handle.finished.finally(() => {
    animationExecutionRegistry.complete(animationId, surface, executionKey);
  });
}
