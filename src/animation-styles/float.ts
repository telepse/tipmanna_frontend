// /* eslint-disable @typescript-eslint/no-explicit-any */
// // // FINAL FIXED CODE

// import { AnimationHandle } from "@/types/animation.types";
// import { ANIMATION_DURATION } from "@/lib/animationContract";

// interface SpiralFloatOptions {
//   icons: string[];

//   // lifecycle
//   mode?: "preview" | "payment";

//   // layout
//   laneTop?: number;
//   laneHeight?: number;

//   // motion
//   spiralRadius?: number;
//   rotations?: number;
//   spacing?: number;

//   // scale
//   scale?: number;
// }

// export function floatStyle({
//   icons,
//   mode = "preview",

//   laneTop = 35,
//   laneHeight = 25,

//   spiralRadius = 40,
//   rotations = 2.5,
//   spacing = 16,

//   scale = 1,
// }: SpiralFloatOptions): AnimationHandle {
//   if (!icons || icons.length === 0) {
//     return {
//       stop: () => {},
//       finished: Promise.resolve(),
//     };
//   }

//   const duration =
//     mode === "payment"
//       ? ANIMATION_DURATION.payment.default
//       : ANIMATION_DURATION.preview.default;

//   let rafId = 0;
//   let stopped = false;
//   let resolved = false;

//   const overlay = document.createElement("div");
//   overlay.className = "spiral-float-overlay";
//   overlay.style.position = "fixed";
//   overlay.style.left = "0";
//   overlay.style.width = "100%";
//   overlay.style.pointerEvents = "none";
//   overlay.style.zIndex = "2147483630";
//   overlay.style.top = `${laneTop}%`;
//   overlay.style.height = `${laneHeight}%`;

//   // DEV telemetry hook (used by wrappers)
//   (overlay as any).__meta = { firstFrameAt: null };

//   document.body.appendChild(overlay);

//   const ICON_COUNT = 5;
//   const iconsEls: HTMLImageElement[] = [];

//   for (let i = 0; i < ICON_COUNT; i++) {
//     const img = document.createElement("img");
//     img.src = icons[i % icons.length];
//     img.className = "spiral-float-icon";
//     img.style.setProperty("--scale", scale.toString());
//     overlay.appendChild(img);
//     iconsEls.push(img);
//   }

//   const startTime = performance.now();

//   function cleanup() {
//     cancelAnimationFrame(rafId);
//     if (overlay.isConnected) overlay.remove();
//   }

//   function stop() {
//     stopped = true;
//     cleanup();
//   }

//   const finished = new Promise<void>(resolve => {
//     function resolveOnce() {
//       if (resolved) return;
//       resolved = true;
//       resolve();
//     }

//     function animate(now: number) {
//       if (!(overlay as any).__meta.firstFrameAt) {
//         (overlay as any).__meta.firstFrameAt = now;
//       }

//       if (stopped) {
//         cleanup();
//         resolveOnce();
//         return;
//       }

//       const elapsed = now - startTime;
//       const progress = Math.min(elapsed / (duration * 0.85), 1);
//       const thetaBase = progress * Math.PI * 2 * rotations;

//       iconsEls.forEach((img, i) => {
//         const phase = (i * 2 * Math.PI) / ICON_COUNT;
//         const theta = thetaBase + phase;
//         const radius = spiralRadius * (1 - progress * 0.2);

//         const x = 120 + (-20 - 120) * progress + i * spacing;
//         const y = Math.sin(theta) * radius + laneHeight * 0.5;

//         img.style.transform = `translate(${x}vw, ${y}%) scale(${scale})`;
//       });

//       if (elapsed < duration) {
//         rafId = requestAnimationFrame(animate);
//       } else {
//         cleanup();
//         resolveOnce();
//       }
//     }

//     rafId = requestAnimationFrame(animate);
//   });

//   return { stop, finished };
// }

// // import { AnimationHandle } from "@/types/animation.types";
// // interface SpiralFloatOptions {
// //   icons: string[];
// //   duration?: number;
// //   laneTop?: number;
// //   laneHeight?: number;
// //   spiralRadius?: number;
// //   rotations?: number;
// //   scale?: number;
// //   spacing?: number;
// //   isPreview?: boolean;
// // }

// // export function floatStyle({
// //   icons,
// //   duration = 20000,
// //   laneTop = 35,
// //   laneHeight = 25,
// //   spiralRadius = 40,
// //   rotations = 2.5,
// //   scale = 1,
// //   spacing = 16,
// // }: SpiralFloatOptions): AnimationHandle {
// //   if (!icons || icons.length === 0) {
// //     return { stop: () => {}, finished: Promise.resolve() };
// //   }

// //   const existing = document.querySelector(".spiral-float-overlay");
// //   if (existing) existing.remove();

// //   let rafId = 0;
// //   let stopped = false;

// //   const overlay = document.createElement("div");
// //   overlay.className = "spiral-float-overlay";
// //   overlay.style.top = `${laneTop}%`;
// //   overlay.style.height = `${laneHeight}%`;
// //   document.body.appendChild(overlay);

// //   const ICON_COUNT = 5;
// //   const iconsEls: HTMLImageElement[] = [];
// //   const startTime = performance.now();

// //   for (let i = 0; i < ICON_COUNT; i++) {
// //     const img = document.createElement("img");
// //     img.src = icons[i % icons.length];
// //     img.className = "spiral-float-icon";
// //     img.style.setProperty("--scale", scale.toString());
// //     overlay.appendChild(img);
// //     iconsEls.push(img);
// //   }

// //   const finished = new Promise<void>(resolve => {
// //     function animate(now: number) {
// //       if (stopped) {
// //         cleanup();
// //         return resolve();
// //       }

// //       const elapsed = now - startTime;
// //       const motionProgress = Math.min(elapsed / (duration * 0.85), 1);
// //       const thetaBase = motionProgress * Math.PI * 2 * rotations;

// //       iconsEls.forEach((img, i) => {
// //         const phase = (i * 2 * Math.PI) / ICON_COUNT;
// //         const theta = thetaBase + phase;
// //         const radius = spiralRadius * (1 - motionProgress * 0.2);

// //         const x = 120 + (-20 - 120) * motionProgress + i * spacing;
// //         const y = Math.sin(theta) * radius + laneHeight * 0.5;

// //         img.style.transform = `translate(${x}vw, ${y}%) scale(${scale})`;
// //       });

// //       if (elapsed < duration) {
// //         rafId = requestAnimationFrame(animate);
// //       } else {
// //         cleanup();
// //         resolve();
// //       }
// //     }

// //     rafId = requestAnimationFrame(animate);
// //   });

// //   function cleanup() {
// //     cancelAnimationFrame(rafId);
// //     overlay.remove();
// //   }

// //   function stop() {
// //     stopped = true;
// //     cleanup();
// //   }

// //   return { stop, finished };
// // }

// import { AnimationHandle } from "@/types/animation.types";
// import { animationRegistry } from "@/lib/animationRegistry";

// type FloatMode = "preview" | "payment";

// type SpiralFloatOptions = {
//   icons: string[];
//   duration: number;
//   container: HTMLElement;
//   mode: FloatMode;
//   animationId: string;

//   laneTop?: number;
//   laneHeight?: number;
//   spiralRadius?: number;
//   rotations?: number;
//   scale?: number;
//   spacing?: number;
//   recomputeOnResize?: boolean; // optional orientation compliance
// };

// export function floatStyle({
//   icons,
//   duration,
//   container,
//   mode,
//   animationId,
//   laneTop = 35,
//   laneHeight = 25,
//   spiralRadius = 40,
//   rotations = 2.5,
//   scale = 1,
//   spacing = 16,
//   recomputeOnResize = false,
// }: SpiralFloatOptions): AnimationHandle {
//   if (!icons.length || !container) {
//     return { stop: () => {}, finished: Promise.resolve() };
//   }

//   // 🔐 Self-contained overlay
//   const overlay = document.createElement("div");
//   Object.assign(overlay.style, {
//     position: "fixed",
//     left: "0",
//     right: "0",
//     top: `${laneTop}%`,
//     height: `${laneHeight}%`,
//     pointerEvents: "none",
//     overflow: "visible",
//     zIndex: "2147483647",
//   });
//   document.body.appendChild(overlay);

//   const ICON_COUNT = mode === "payment" ? 7 : 5;
//   const iconsEls: HTMLImageElement[] = [];
//   const rafIds = new Set<number>();
//   let stopped = false;

//   // 🔄 Deterministic horizontal origin
//   let rect = container.getBoundingClientRect();
//   let originX = rect.left + rect.width / 2;

//   function recomputeOrigin() {
//     rect = container.getBoundingClientRect();
//     originX = rect.left + rect.width / 2;
//   }

//   if (recomputeOnResize) {
//     window.addEventListener("resize", recomputeOrigin);
//   }

//   const startTime = performance.now();
//   const MIN_PAYMENT_LIFETIME = duration * 0.85;
//   let firstFramePainted = false;

//   for (let i = 0; i < ICON_COUNT; i++) {
//     const img = document.createElement("img");
//     img.src = icons[i % icons.length];

//     Object.assign(img.style, {
//       position: "absolute",
//       width: "96px",
//       height: "96px",
//       left: `${originX}px`,
//       top: "50%",
//       transform: "translate(-50%, -50%)",
//       pointerEvents: "none",
//       willChange: "transform, opacity",
//     });

//     overlay.appendChild(img);
//     iconsEls.push(img);
//   }

//   function animate(now: number) {
//     if (stopped) return;

//     if (!firstFramePainted) firstFramePainted = true;

//     const elapsed = now - startTime;
//     const t = Math.min(elapsed / duration, 1);

//     const motionT = t < 0.75 ? t / 0.75 : 1;
//     const releaseT = t < 0.85 ? 0 : (t - 0.85) / 0.15;
//     const thetaBase = motionT * Math.PI * 2 * rotations;

//     iconsEls.forEach((img, i) => {
//       const phase = (i * 2 * Math.PI) / ICON_COUNT;
//       const theta = thetaBase + phase;
//       const radius = spiralRadius * (1 - motionT * 0.15);
//       const x = -20 + 140 * motionT + i * spacing;
//       const y = Math.sin(theta) * radius + laneHeight * 0.5;
//       const scaleOut = 1 - releaseT * 0.3;

//       img.style.transform = `
//         translate(${x}vw, ${y}%)
//         scale(${scale * scaleOut})
//       `;
//       img.style.opacity = t < 0.85 ? "1" : `${1 - releaseT}`;
//     });

//     if (t < 1) {
//       const id = requestAnimationFrame(animate);
//       rafIds.add(id);
//     }
//   }

//   const id = requestAnimationFrame(animate);
//   rafIds.add(id);

//   const finished = new Promise<void>(resolve => {
//     // ✅ Guarantee at least one frame before resolving
//     const check = () => {
//       if (!firstFramePainted) {
//         requestAnimationFrame(check);
//       } else if (stopped || performance.now() - startTime >= duration) {
//         resolve();
//       } else {
//         requestAnimationFrame(check);
//       }
//     };
//     check();
//   });

//   function stop() {
//     if (stopped) return;

//     // 🔒 Payment MIN_DURATION protection
//     if (
//       mode === "payment" &&
//       performance.now() - startTime < MIN_PAYMENT_LIFETIME
//     ) {
//       return;
//     }

//     stopped = true;

//     rafIds.forEach(cancelAnimationFrame);
//     rafIds.clear();

//     iconsEls.forEach(el => el.remove());
//     overlay.remove();

//     if (recomputeOnResize) {
//       window.removeEventListener("resize", recomputeOrigin);
//     }

//     animationRegistry.unregister(animationId);
//   }

//   // 🔐 Registry protection
//   animationRegistry.register({
//     id: animationId,
//     mode,
//     stop,
//   });

//   finished.then(() => stop());

//   return { stop, finished };
// }

import { AnimationHandle } from "@/types/animation.types";
import { AnimationMode } from "@/lib/animationMode";

interface SpiralFloatOptions {
  icons: string[];

  // lifecycle
  mode: AnimationMode;

  // layout
  laneTop?: number;
  laneHeight?: number;
  duration: number;

  // motion
  spiralRadius?: number;
  rotations?: number;
  spacing?: number;

  // scale
  scale?: number;
}

export function floatStyle({
  icons,
  duration = 20000,
  laneTop = 35,
  laneHeight = 25,
  spiralRadius = 40,
  rotations = 2.5,
  scale = 1,
  spacing = 16,
  mode,
}: SpiralFloatOptions): AnimationHandle {
  if (!icons?.length) {
    return { stop: () => {}, finished: Promise.resolve() };
  }

  const isPreview = mode === "preview";

  const overlay = document.createElement("div");

  Object.assign(overlay.style, {
    position: "fixed",
    left: "0",
    right: "0",
    top: `${laneTop}%`,
    height: `${laneHeight}%`,
    pointerEvents: "none",
    overflow: "visible",
    zIndex: "2147483647",
  });

  document.body.appendChild(overlay);

  const ICON_COUNT = isPreview ? 5 : 7;
  const iconsEls: HTMLImageElement[] = [];

  const startTime = performance.now();
  const MIN_PAYMENT_LIFETIME = duration * 0.85;

  let stopped = false;
  let rafId = 0;
  let firstFrame = false;

  for (let i = 0; i < ICON_COUNT; i++) {
    const img = document.createElement("img");
    img.src = icons[i % icons.length];

    Object.assign(img.style, {
      position: "absolute",
      width: "96px",
      height: "96px",
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)",
      pointerEvents: "none",
      willChange: "transform, opacity",
    });

    overlay.appendChild(img);
    iconsEls.push(img);
  }

  function animate(now: number) {
    if (stopped) return;

    if (!firstFrame) firstFrame = true;

    const elapsed = now - startTime;
    const t = Math.min(elapsed / duration, 1);

    const thetaBase = t * Math.PI * 2 * rotations;

    iconsEls.forEach((img, i) => {
      const phase = (i * 2 * Math.PI) / ICON_COUNT;
      const theta = thetaBase + phase;

      const radius = spiralRadius * (1 - t * 0.2);
      const x = -20 + 140 * t + i * spacing;
      const y = Math.sin(theta) * radius + laneHeight * 0.5;

      img.style.transform = `
        translate(${x}vw, ${y}%)
        scale(${scale})
      `;

      img.style.opacity = t < 0.85 ? "1" : `${1 - (t - 0.85) / 0.15}`;
    });

    if (t < 1) {
      rafId = requestAnimationFrame(animate);
    } else {
      cleanup();
    }
  }

  rafId = requestAnimationFrame(animate);

  function cleanup() {
    cancelAnimationFrame(rafId);
    iconsEls.forEach(el => el.remove());
    overlay.remove();
  }

  function stop() {
    if (stopped) return;

    const elapsed = performance.now() - startTime;

    if (!isPreview && elapsed < MIN_PAYMENT_LIFETIME) return;

    stopped = true;
    cleanup();
  }

  const finished = new Promise<void>(resolve => {
    const check = () => {
      if (!firstFrame) {
        requestAnimationFrame(check);
      } else if (stopped || performance.now() - startTime >= duration) {
        resolve();
      } else {
        requestAnimationFrame(check);
      }
    };
    check();
  });

  return { stop, finished };
}
