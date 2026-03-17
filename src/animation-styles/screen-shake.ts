import { AnimationHandle } from "@/types/animation.types";
import { AnimationMode } from "@/lib/animationMode";

type GlowOrigin = "top" | "bottom";

export interface ScreenShakeOptions {
  icons: string[];
  target?: HTMLElement; // mount target (preview wrapper or payment container)
  intensity?: number;
  duration?: number;
  glowOrigin?: GlowOrigin;
  maxIcons?: number;
  mode: AnimationMode;
}

export function screenShakeStyle(options: ScreenShakeOptions): AnimationHandle {
  if (!options.icons || options.icons.length === 0)
    return { stop: () => {}, finished: Promise.resolve() };

  const isPreview = options.mode === "preview";

  const {
    icons,
    target,
    intensity = 32,
    duration = 6000,
    glowOrigin = "bottom",
    maxIcons = 40,
  } = options;
  const mount = target ?? document.body;
  const existing = mount.querySelector<HTMLDivElement>("#icon-shake-overlay");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  Object.assign(overlay.style, {
    position: target ? "absolute" : "fixed",
    inset: "0",
    pointerEvents: "none",
    zIndex: "2147483647",
  });
  overlay.id = "icon-shake-overlay";
  overlay.dataset.glow = glowOrigin;
  mount.appendChild(overlay);
  if (target) {
    if (getComputedStyle(target).position === "static")
      target.style.position = "relative";
    overlay.classList.add("scoped");
  } else overlay.classList.add("fullscreen");

  const uniqueIcons = Array.from(new Set(icons));
  let placed = 0,
    row = 0;
  const minIconsPerRow = 3,
    maxIconsPerRow = 4,
    rowSpacing = 15;
  const startY = glowOrigin === "bottom" ? 80 : 10;
  while (placed < maxIcons) {
    const count = Math.min(
      Math.floor(Math.random() * (maxIconsPerRow - minIconsPerRow + 1)) +
        minIconsPerRow,
      maxIcons - placed
    );
    for (let i = 0; i < count; i++) {
      const img = document.createElement("img");
      img.src = uniqueIcons[placed % uniqueIcons.length];

      img.className = "shake-icon";
      img.style.left = `${Math.random() * 90 + 5}%`;
      img.style.top = `${startY - row * rowSpacing}%`;

      Object.assign(img.style, {
        position: "absolute",
        width: "96px",
        height: "96px",
        left: `${Math.random() * 90 + 5}%`,
        top: `${startY - row * rowSpacing}%`,
        pointerEvents: "none",
        willChange: "transform, opacity",
      });
      overlay.appendChild(img);
      placed++;
    }
    row++;
  }

  const startTime = performance.now();
  const MIN_PAYMENT_LIFETIME = duration * 0.85;
  let rafId = 0;
  let stopped = false;

  const finishedPromise = new Promise<void>(resolve => {
    function animate(now: number) {
      if (stopped) {
        cleanup();
        return resolve();
      }
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const opacity = progress > 0.85 ? 1 - (progress - 0.85) / 0.15 : 1;
      overlay.style.opacity = `${opacity}`;
      const decay =
        progress < 0.75 ? 0.85 : 0.85 * (1 - (progress - 0.75) / 0.25);
      const x = Math.sin(elapsed * 0.02) * intensity * decay;
      const y = Math.cos(elapsed * 0.018) * intensity * decay;
      overlay.style.transform = `translate(${x}px, ${y}px)`;
      if (progress < 1) rafId = requestAnimationFrame(animate);
      else {
        cleanup();
        resolve();
      }
    }
    rafId = requestAnimationFrame(animate);
  });

  function cleanup() {
    cancelAnimationFrame(rafId);
    overlay.remove();
  }

  function stop() {
    const elapsed = performance.now() - startTime;
    if (!isPreview && elapsed < MIN_PAYMENT_LIFETIME) return; // Payment survivability
    stopped = true;
    cleanup();
  }

  return { stop, finished: finishedPromise };
}

/* ---------------- Screen Shake ---------------- */
// export function triggerIconScreenShake(
//   options: ScreenShakeOptions
// ): AnimationHandle {
//   const {
//     icons,
//     target,
//     intensity = 32,
//     glowOrigin = "bottom",
//     maxIcons = 40,
//   } = options;

//   if (!icons || icons.length === 0) {
//     return { stop: () => {}, finished: Promise.resolve() };
//   }

//   const mode = options.mode ?? "preview";
//   const duration =
//     options.duration ??
//     (mode === "payment"
//       ? ANIMATION_DURATION.payment.default
//       : ANIMATION_DURATION.preview.default);

//   /* ---------------- Mount ---------------- */
//   const mount = target ?? document.body;

//   // Event-safe: only remove overlay in this mount
//   const existing = mount.querySelector<HTMLDivElement>("#icon-shake-overlay");
//   if (existing) existing.remove();

//   const overlay = document.createElement("div");
//   overlay.id = "icon-shake-overlay";
//   overlay.dataset.glow = glowOrigin;

//   mount.appendChild(overlay);

//   if (target) {
//     const style = getComputedStyle(target);
//     if (style.position === "static") target.style.position = "relative";
//     overlay.classList.add("scoped");
//   } else {
//     overlay.classList.add("fullscreen");
//   }

//   /* ---------------- Icons ---------------- */
//   const uniqueIcons = Array.from(new Set(icons));
//   const minIconsPerRow = 3;
//   const maxIconsPerRow = 4;
//   const rowSpacing = 15;
//   const startY = glowOrigin === "bottom" ? 80 : 10;

//   let placed = 0;
//   let row = 0;

//   while (placed < maxIcons) {
//     const count = Math.min(
//       Math.floor(Math.random() * (maxIconsPerRow - minIconsPerRow + 1)) +
//         minIconsPerRow,
//       maxIcons - placed
//     );

//     for (let i = 0; i < count; i++) {
//       const img = document.createElement("img");
//       img.src = uniqueIcons[placed % uniqueIcons.length];
//       img.className = "shake-icon";
//       img.style.left = `${Math.random() * 90 + 5}%`;
//       img.style.top = `${startY - row * rowSpacing}%`;
//       overlay.appendChild(img);
//       placed++;
//     }
//     row++;
//   }

//   /* ---------------- Animation ---------------- */
//   let rafId = 0;
//   let stopped = false;
//   let resolved = false;
//   const startTime = performance.now();

//   const finished = new Promise<void>(resolve => {
//     function resolveOnce() {
//       if (resolved) return;
//       resolved = true;
//       resolve();
//     }

//     function animate(now: number) {
//       if (stopped) {
//         cleanup();
//         resolveOnce();
//         return;
//       }

//       const elapsed = now - startTime;
//       const progress = Math.min(elapsed / duration, 1);

//       // Fade out at the end
//       const opacity = progress > 0.85 ? 1 - (progress - 0.85) / 0.15 : 1;
//       overlay.style.opacity = `${opacity}`;

//       // Shake decay
//       const decay =
//         progress < 0.75 ? 0.85 : 0.85 * (1 - (progress - 0.75) / 0.25);

//       const x = Math.sin(elapsed * 0.02) * intensity * decay;
//       const y = Math.cos(elapsed * 0.018) * intensity * decay;

//       overlay.style.transform = `translate(${x}px, ${y}px)`;

//       if (progress < 1) {
//         rafId = requestAnimationFrame(animate);
//       } else {
//         cleanup();
//         resolveOnce();
//       }
//     }

//     rafId = requestAnimationFrame(animate);
//   });

//   /* ---------------- Cleanup ---------------- */
//   function cleanup() {
//     cancelAnimationFrame(rafId);
//     if (overlay.isConnected) overlay.remove();
//   }

//   function stop() {
//     stopped = true;
//     overlay.style.transition = "opacity 0.3s ease-out, transform 0.3s ease-out";
//     overlay.style.opacity = "0";
//     cleanup();
//   }

//   return {
//     stop,
//     finished,
//   };
// }

// import { AnimationHandle } from "@/types/animation.types";

// type GlowOrigin = "top" | "bottom";

// export interface ScreenShakeOptions {
//   icons: string[];
//   target?: HTMLElement; // mount target (preview wrapper or payment container)
//   intensity?: number;
//   duration?: number;
//   glowOrigin?: GlowOrigin;
//   maxIcons?: number;
//   mode: "preview" | "payment";
// }

// /* ---------------- Screen Shake ---------------- */
// export function triggerIconScreenShake(
//   options: ScreenShakeOptions
// ): AnimationHandle {
//   if (!options.icons || options.icons.length === 0) {
//     return { stop: () => {}, finished: Promise.resolve() };
//   }

//   const {
//     icons,
//     target,
//     intensity = 32,
//     duration,
//     glowOrigin = "bottom",
//     maxIcons = 40,
//   } = options;

//   /* ---------------- Mount ---------------- */

//   const mount = target ?? document.body;

//   // Ensure only one screen shake per mount
//   const existing = mount.querySelector<HTMLDivElement>("#icon-shake-overlay");
//   if (existing) existing.remove();

//   /* ---------------- Overlay ---------------- */

//   const overlay = document.createElement("div");
//   overlay.id = "icon-shake-overlay";
//   overlay.dataset.glow = glowOrigin;

//   mount.appendChild(overlay);

//   if (target) {
//     const style = getComputedStyle(target);
//     if (style.position === "static") {
//       target.style.position = "relative";
//     }
//     overlay.classList.add("scoped");
//   } else {
//     overlay.classList.add("fullscreen");
//   }

//   /* ---------------- Icons ---------------- */

//   const uniqueIcons = Array.from(new Set(icons));
//   const minIconsPerRow = 3;
//   const maxIconsPerRow = 4;
//   const rowSpacing = 15;
//   const startY = glowOrigin === "bottom" ? 80 : 10;

//   let placed = 0;
//   let row = 0;

//   while (placed < maxIcons) {
//     const count = Math.min(
//       Math.floor(Math.random() * (maxIconsPerRow - minIconsPerRow + 1)) +
//         minIconsPerRow,
//       maxIcons - placed
//     );

//     for (let i = 0; i < count; i++) {
//       const img = document.createElement("img");
//       img.src = uniqueIcons[placed % uniqueIcons.length];
//       img.className = "shake-icon";
//       img.style.left = `${Math.random() * 90 + 5}%`;
//       img.style.top = `${startY - row * rowSpacing}%`;
//       overlay.appendChild(img);
//       placed++;
//     }
//     row++;
//   }

//   /* ---------------- Animation ---------------- */

//   let rafId = 0;
//   let stopped = false;
//   const startTime = performance.now();

//   const finishedPromise = new Promise<void>(resolve => {
//     function animate(now: number) {
//       if (stopped) {
//         cleanup();
//         return resolve();
//       }

//       const elapsed = now - startTime;
//       const progress = Math.min(elapsed / duration!, 1);

//       // Fade out at the end
//       const opacity = progress > 0.85 ? 1 - (progress - 0.85) / 0.15 : 1;
//       overlay.style.opacity = `${opacity}`;

//       // Shake decay
//       const decay =
//         progress < 0.75 ? 0.85 : 0.85 * (1 - (progress - 0.75) / 0.25);

//       const x = Math.sin(elapsed * 0.02) * intensity * decay;
//       const y = Math.cos(elapsed * 0.018) * intensity * decay;

//       overlay.style.transform = `translate(${x}px, ${y}px)`;

//       if (progress < 1) {
//         rafId = requestAnimationFrame(animate);
//       } else {
//         cleanup();
//         resolve();
//       }
//     }

//     rafId = requestAnimationFrame(animate);
//   });

//   /* ---------------- Cleanup ---------------- */

//   function cleanup() {
//     cancelAnimationFrame(rafId);
//     overlay.remove();
//   }

//   function stop() {
//     stopped = true;
//     overlay.style.transition = "opacity 0.3s ease-out, transform 0.3s ease-out";
//     overlay.style.opacity = "0";
//     cleanup();
//   }

//   return {
//     stop,
//     finished: finishedPromise,
//   };
// }

// import { AnimationHandle } from "@/types/animation.types";
// import { animationRegistry } from "@/lib/animationRegistry";

// type GlowOrigin = "top" | "bottom";
// type ShakeMode = "preview" | "payment";

// export interface ScreenShakeOptions {
//   icons: string[];
//   container: HTMLElement;
//   mode: ShakeMode;
//   animationId: string;

//   intensity?: number;
//   duration?: number; // max 1800ms
//   glowOrigin?: GlowOrigin;
//   maxIcons?: number;
//   recomputeOnResize?: boolean; // optional orientation compliance
// }

// /* ---------------- Screen Shake (ACCENT ONLY) ---------------- */
// export function triggerIconScreenShake({
//   icons,
//   container,
//   mode,
//   animationId,
//   intensity = 24,
//   duration = 1600,
//   glowOrigin = "bottom",
//   maxIcons = 24,
//   recomputeOnResize = false,
// }: ScreenShakeOptions): AnimationHandle {
//   if (!icons.length || !container) {
//     return { stop: () => {}, finished: Promise.resolve() };
//   }

//   const SHAKE_DURATION = Math.min(duration, 1800);

//   /* ---------------- Overlay ---------------- */
//   const overlay = document.createElement("div");
//   Object.assign(overlay.style, {
//     position: "fixed",
//     inset: "0",
//     pointerEvents: "none",
//     overflow: "visible",
//     zIndex: "2147483647",
//     willChange: "transform, opacity",
//   });
//   overlay.dataset.glow = glowOrigin;
//   document.body.appendChild(overlay);

//   /* ---------------- Icons (STATIC DECOR) ---------------- */
//   const uniqueIcons = Array.from(new Set(icons));
//   const ICON_COUNT = Math.min(maxIcons, uniqueIcons.length * 4);
//   const iconEls: HTMLImageElement[] = [];

//   for (let i = 0; i < ICON_COUNT; i++) {
//     const img = document.createElement("img");
//     img.src = uniqueIcons[i % uniqueIcons.length];

//     Object.assign(img.style, {
//       position: "absolute",
//       width: "64px",
//       height: "64px",
//       left: `${10 + (i % 6) * 14}%`,
//       top:
//         glowOrigin === "bottom"
//           ? `${75 - Math.floor(i / 6) * 12}%`
//           : `${10 + Math.floor(i / 6) * 12}%`,
//       opacity: "0.85",
//       pointerEvents: "none",
//     });

//     overlay.appendChild(img);
//     iconEls.push(img);
//   }

//   /* ---------------- Orientation Safety ---------------- */
//   function recomputeOrigin() {
//     // Could extend with dynamic intensity or viewport scaling if needed
//   }

//   if (recomputeOnResize) {
//     window.addEventListener("resize", recomputeOrigin);
//   }

//   /* ---------------- Animation ---------------- */
//   const startTime = performance.now();
//   let stopped = false;
//   let rafId: number | null = null;
//   let firstFramePainted = false;

//   const finished = new Promise<void>(resolve => {
//     function animate(now: number) {
//       if (stopped) return;

//       if (!firstFramePainted) firstFramePainted = true;

//       const elapsed = now - startTime;
//       const t = Math.min(elapsed / SHAKE_DURATION, 1);

//       // 🧠 Punch → decay → release
//       const strength = t < 0.35 ? 1 : t < 0.75 ? 1 - (t - 0.35) / 0.4 : 0;

//       const x = Math.sin(elapsed * 0.03) * intensity * strength;
//       const y = Math.cos(elapsed * 0.028) * intensity * strength;

//       overlay.style.transform = `translate(${x}px, ${y}px)`;
//       overlay.style.opacity = `${1 - Math.max(0, (t - 0.75) / 0.25)}`;

//       if (t < 1) {
//         rafId = requestAnimationFrame(animate);
//       } else {
//         cleanup();
//         resolve();
//       }
//     }

//     // ✅ Guarantee first frame before promise resolves
//     const initialFrame = () => {
//       rafId = requestAnimationFrame(animate);
//     };
//     initialFrame();
//   });

//   /* ---------------- Cleanup ---------------- */
//   function cleanup() {
//     if (rafId !== null) cancelAnimationFrame(rafId);
//     overlay.remove();
//     iconEls.forEach(el => el.remove());

//     if (recomputeOnResize) {
//       window.removeEventListener("resize", recomputeOrigin);
//     }

//     animationRegistry.unregister(animationId);
//   }

//   function stop() {
//     if (stopped) return;
//     stopped = true;
//     // Payment survivability: screen-shake is accent, still respecting checklist
//     cleanup();
//   }

//   // 🔐 Registry protection
//   animationRegistry.register({
//     id: animationId,
//     mode,
//     stop,
//   });

//   return { stop, finished };
// }
