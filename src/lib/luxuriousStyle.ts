// // import { AnimationHandle } from "@/types/animation.types";

// // export function luxuriousStyle({
// //   videos = [],
// //   count = 1,
// //   stagger = 0.2,
// //   duration = 8,
// //   containerId = "preview-animation-root",
// //   isPreview = false,
// // }: {
// //   videos: string[];
// //   count?: number;
// //   stagger?: number;
// //   duration?: number;
// //   containerId?: string;
// //   isPreview?: boolean;
// // }): AnimationHandle {
// //   if (!videos.length) return { stop: () => {}, finished: Promise.resolve() };

// //   const nodes: HTMLVideoElement[] = [];
// //   const timeouts: number[] = [];
// //   let stopped = false;

// //   // 🔒 CRITICAL WINDOW — payment cannot be killed before this
// //   const MIN_PAYMENT_LIFETIME = duration * 0.85;
// //   const startTime = performance.now();

// //   const container = document.getElementById(containerId);
// //   if (!container) return { stop: () => {}, finished: Promise.resolve() };

// //   const finished = new Promise<void>(resolve => {
// //     for (let i = 0; i < count; i++) {
// //       const video = document.createElement("video");
// //       video.src = videos[i % videos.length];
// //       video.muted = true;
// //       video.autoplay = true;
// //       video.loop = false;
// //       video.playsInline = true;

// //       // 🔹 Center middle of screen, front-most
// //       video.style.position = "fixed";
// //       video.style.top = "50%";
// //       video.style.left = "50%";
// //       video.style.transform = "translate(-50%, -50%)";
// //       video.style.width = "350px";
// //       video.style.height = "350px";
// //       video.style.pointerEvents = "none";
// //       video.style.zIndex = "999999"; // highest front-most
// //       video.style.animationDelay = `${i * stagger}s`;

// //       container.appendChild(video);
// //       nodes.push(video);
// //       video.play().catch(() => {});

// //       const t = window.setTimeout(
// //         () => {
// //           video.pause();
// //           video.remove();
// //           if (!stopped && i === count - 1) resolve();
// //         },
// //         (duration + i * stagger) * 1000
// //       );
// //       timeouts.push(t);
// //     }
// //   });

// //   function cleanup() {
// //     nodes.forEach(v => (v.pause(), v.remove()));
// //   }

// //   function stop() {
// //     if (stopped) return;

// //     // 🔒 PAYMENT PROTECTION
// //     if (!isPreview && performance.now() - startTime < MIN_PAYMENT_LIFETIME) {
// //       return;
// //     }

// //     stopped = true;
// //     timeouts.forEach(clearTimeout);
// //     cleanup();
// //   }

// //   return { stop, finished };
// // }

import { AnimationHandle } from "@/types/animation.types";
import { AnimationMode } from "./animationMode";

export function luxuriousStyle({
  videos = [],
  count = 1,
  stagger = 0.2,
  duration = 8,
  containerId = "preview-animation-root",
  mode,
}: {
  videos: string[];
  count?: number;
  stagger?: number;
  duration?: number;
  containerId?: string;
  mode: AnimationMode;
}): AnimationHandle {
  if (!videos.length) return { stop: () => {}, finished: Promise.resolve() };

  const nodes: HTMLVideoElement[] = [];
  const timeouts: number[] = [];
  let stopped = false;

  const MIN_PAYMENT_LIFETIME = duration * 0.85 * 1000; // milliseconds
  const startTime = performance.now();

  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(
      `Luxurious animation container with id "${containerId}" not found. Animation skipped.`
    );
    return { stop: () => {}, finished: Promise.resolve() };
  }

  const isPreview = mode === "preview";

  // ---------- Spawn videos ----------
  for (let i = 0; i < count; i++) {
    const video = document.createElement("video");
    video.src = videos[i % videos.length];
    video.muted = true;
    video.autoplay = true;
    video.loop = isPreview; // loop only in preview
    video.playsInline = true;

    // 🔹 Position
    video.style.position = "fixed";
    video.style.top = "50%";
    video.style.left = "50%";
    video.style.transform = "translate(-50%, -50%)";
    video.style.width = "350px";
    video.style.height = "350px";
    video.style.pointerEvents = "none";
    video.style.zIndex = "999999";
    video.style.animationDelay = `${i * stagger}s`;

    container.appendChild(video);
    nodes.push(video);
    video.play().catch(() => {});
  }

  // ---------- Finished promise ----------
  const TOTAL_DURATION = (duration + (count - 1) * stagger) * 1000;

  const finished = new Promise<void>(resolve => {
    const t = window.setTimeout(() => {
      stopped = true;
      cleanup();
      resolve();
    }, TOTAL_DURATION);
    timeouts.push(t);
  });

  // ---------- Cleanup function ----------
  function cleanup() {
    nodes.forEach(v => {
      v.pause();
      v.remove();
    });
    timeouts.forEach(clearTimeout);
    timeouts.length = 0;
  }

  // ---------- Stop function ----------
  function stop() {
    if (stopped) return;

    const elapsed = performance.now() - startTime;

    // 🔒 PAYMENT PROTECTION WINDOW
    if (!isPreview && elapsed < MIN_PAYMENT_LIFETIME) return;

    stopped = true;
    cleanup();
  }

  return { stop, finished };
}

// import { AnimationHandle } from "@/types/animation.types";
// import { animationRegistry } from "@/lib/animationRegistry";

// type LuxuriousMode = "preview" | "payment";

// interface LuxuriousOptions {
//   videos: string[];
//   count?: number;
//   stagger?: number;
//   duration?: number; // seconds
//   mode: LuxuriousMode;
//   animationId: string;
// }

// export function luxuriousStyle({
//   videos,
//   count = 1,
//   stagger = 0.25,
//   duration = 8,
//   mode,
//   animationId,
// }: LuxuriousOptions): AnimationHandle {
//   if (!videos.length) {
//     return { stop: () => {}, finished: Promise.resolve() };
//   }

//   /* ---------------- Overlay (MANDATORY) ---------------- */
//   const overlay = document.createElement("div");
//   Object.assign(overlay.style, {
//     position: "fixed",
//     inset: "0",
//     pointerEvents: "none",
//     zIndex: "2147483647",
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "center",
//   });
//   document.body.appendChild(overlay);

//   /* ---------------- State ---------------- */
//   const videosEls: HTMLVideoElement[] = [];
//   const timeouts: number[] = [];
//   let stopped = false;
//   const startTime = performance.now();

//   const MIN_PAYMENT_LIFETIME = mode === "payment" ? duration * 0.85 * 1000 : 0;

//   /* ---------------- Spawn ---------------- */
//   for (let i = 0; i < count; i++) {
//     const video = document.createElement("video");
//     video.src = videos[i % videos.length];
//     video.muted = true;
//     video.playsInline = true;
//     video.preload = "auto";
//     video.loop = mode === "preview";

//     Object.assign(video.style, {
//       position: "absolute",
//       width: "360px",
//       height: "360px",
//       transform: "translate(-50%, -50%) scale(1)",
//       top: "50%",
//       left: "50%",
//       opacity: "0",
//       transition: "opacity 0.6s ease, transform 0.6s ease",
//       willChange: "opacity, transform",
//     });

//     overlay.appendChild(video);
//     videosEls.push(video);

//     // 🔐 First-frame guarantee & registry-aware
//     video.onloadeddata = () => {
//       if (stopped) return;
//       video.currentTime = 0;
//       video.play().catch(() => {});
//       requestAnimationFrame(() => {
//         if (stopped) return;
//         video.style.opacity = "1";
//         video.style.transform = "translate(-50%, -50%) scale(1.05)";
//       });
//     };

//     const spawnTimeout = window.setTimeout(
//       () => {
//         if (!stopped && video.readyState >= 2) {
//           video.style.opacity = "1";
//         }
//       },
//       i * stagger * 1000
//     );

//     timeouts.push(spawnTimeout);
//   }

//   /* ---------------- Finish ---------------- */
//   const TOTAL_DURATION = (duration + (count - 1) * stagger) * 1000;

//   const finished = new Promise<void>(resolve => {
//     const finishTimeout = window.setTimeout(() => {
//       gracefulExit();
//       resolve();
//     }, TOTAL_DURATION);
//     timeouts.push(finishTimeout);
//   });

//   /* ---------------- Exit ---------------- */
//   function gracefulExit() {
//     videosEls.forEach(v => {
//       v.style.opacity = "0";
//       v.style.transform = "translate(-50%, -50%) scale(0.98)";
//     });

//     const cleanupTimeout = window.setTimeout(cleanup, 700);
//     timeouts.push(cleanupTimeout);
//   }

//   function cleanup() {
//     videosEls.forEach(v => {
//       v.pause();
//       v.remove();
//     });
//     timeouts.forEach(clearTimeout);
//     overlay.remove();

//     // 🔐 Registry unregistration
//     animationRegistry.unregister(animationId);
//   }

//   /* ---------------- Stop ---------------- */
//   function stop() {
//     if (stopped) return;

//     const elapsed = performance.now() - startTime;

//     // 🔒 Payment lock
//     if (mode === "payment" && elapsed < MIN_PAYMENT_LIFETIME) {
//       return;
//     }

//     stopped = true;
//     gracefulExit();
//   }

//   // 🔐 Registry registration
//   animationRegistry.register({
//     id: animationId,
//     mode,
//     stop,
//   });

//   return { stop, finished };
// }
