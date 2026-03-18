// /* eslint-disable @typescript-eslint/no-explicit-any */
// /**
//  * 🟢 PREVIEW CONTROLLER (ISOLATED / SAFE)
//  *
//  * Guarantees:
//  * - Preview lifetime authority (3.5s)
//  * - Zero interaction with payment animations
//  * - DEV-only overrun warnings
//  */

// import { AnimationHandle } from "@/types/animation.types";
// import { ANIMATION_DURATION } from "@/lib/animationContract";

// if (typeof window !== "undefined") {
//   (window as any).__PREVIEW_ACTIVE__ = true;
// }

// /* ───────────── Constants ───────────── */
// const MIN_PREVIEW = ANIMATION_DURATION.preview.min;
// const MAX_PREVIEW = ANIMATION_DURATION.preview.max;
// const WARN_THRESHOLD = ANIMATION_DURATION.preview.default * 1.2;

// /* ───────────── State (PREVIEW-ONLY) ───────────── */
// let previewHandle: AnimationHandle | null = null;
// let previewStartedAt = 0;

// let killTimer: number | null = null;
// let warnTimer: number | null = null;

// /* ───────────── Helpers ───────────── */
// function devWarn(message: string) {
//   if (typeof window !== undefined) {
//     console.warn(`[PreviewController] ${message}`);
//   }
// }

// function clearTimers() {
//   if (killTimer) clearTimeout(killTimer);
//   if (warnTimer) clearTimeout(warnTimer);
//   killTimer = null;
//   warnTimer = null;
// }

// /* ───────────── Start Preview ───────────── */
// export function startPreview(
//   _eventId: string,
//   _tipperId: string,
//   start: () => AnimationHandle
// ) {
//   const now = performance.now();

//   // Stop previous PREVIEW only (never payment)
//   if (previewHandle) {
//     previewHandle.stop();
//   }

//   clearTimers();

//   previewStartedAt = now;
//   previewHandle = start(); // 👈 preview-owned handle only

//   // DEV warning if preview exceeds budget
//   warnTimer = window.setTimeout(() => {
//     devWarn(
//       `Preview exceeded ${WARN_THRESHOLD}ms. Style may be ignoring preview energy compression.`
//     );
//   }, WARN_THRESHOLD);

//   // Hard stop at MAX_PREVIEW
//   killTimer = window.setTimeout(() => {
//     previewHandle?.stop();
//     previewHandle = null;
//     clearTimers();
//   }, MAX_PREVIEW);
// }

// /* ───────────── Explicit Stop ───────────── */
// export function stopPreview(_eventId: string, _tipperId: string) {
//   if (!previewHandle) return;

//   const lived = performance.now() - previewStartedAt;
//   if (lived >= MIN_PREVIEW) {
//     previewHandle.stop();
//     previewHandle = null;
//     clearTimers();
//   }
// }

// /* ───────────── Stop All (Preview Only) ───────────── */
// export function stopPreviews(_reason: "new_preview" | "payment_commit") {
//   clearTimers();

//   previewHandle?.stop();
//   previewHandle = null;
// }

// /* ───────────── Visual Softening ───────────── */
// export function softenPreviews() {
//   const root = document.getElementById("preview-animation-root");
//   if (root) root.style.opacity = "0.4";
// }

// export function startPreviewAnimation(
//   factory: (mode: "preview") => AnimationHandle
// ) {
//   return factory("preview");
// }

// export function playPreviewAnimation(
//   factory: (mode: "preview") => AnimationHandle
// ) {
//   return factory("preview");
// }

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * 🟢 PREVIEW CONTROLLER (ISOLATED / SAFE)
 *
 * Guarantees:
 * - Only ONE preview can exist at a time
 * - Clicking a new preview instantly cancels the previous one
 * - Hard stop at MAX_PREVIEW
 * - No interaction with payment animations
 */

import { AnimationHandle } from "@/types/animation.types";
import { ANIMATION_DURATION } from "@/lib/animationContract";

/* ───────────── Constants ───────────── */

const { min: MIN_PREVIEW, max: MAX_PREVIEW } = ANIMATION_DURATION.preview;

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
  activePreview?.stop();
  activePreview = null;
}

/* ───────────── Public API ───────────── */

/**
 * Starts a preview.
 * If another preview is playing, it is cancelled immediately.
 */
// export function startPreview(factory: () => AnimationHandle) {
//   // 🔴 Always cancel existing preview first
//   stopActivePreview();

//   // 🟢 Start new preview
//   activePreview = factory();

//   // ⏱ Hard kill at MAX_PREVIEW
//   killTimer = window.setTimeout(() => {
//     stopActivePreview();
//   }, MAX_PREVIEW);
// }

export function startPreview(factory: () => AnimationHandle) {
  stopActivePreview();

  activePreview = factory();
  if (activePreview.start) {
    activePreview.start();
  }

  killTimer = window.setTimeout(() => {
    stopActivePreview();
  }, MAX_PREVIEW);
}

/**
 * Stops the current preview (if any).
 */
export function stopPreview() {
  stopActivePreview();
}
