import { AnimationHandle } from "@/types/animation.types";
import { ANIMATION_DURATION } from "./animationContract";
import { AnimationMode } from "./animationMode";

export function luxuriousStyle({
  videos = [],
  count = 1,
  stagger = 200,
  duration: durationParam,
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

  const duration =
    durationParam ??
    (mode === "preview"
      ? ANIMATION_DURATION.preview.default
      : ANIMATION_DURATION.payment.default);

  const nodes: HTMLVideoElement[] = [];
  const timeouts: number[] = [];
  const entranceAnimations: Animation[] = [];
  let stopped = false;

  const isPreview = mode === "preview";

  const MIN_PAYMENT_LIFETIME = duration * 0.85;
  const startTime = performance.now();

  const mount: HTMLElement | null = isPreview
    ? document.getElementById(containerId)
    : document.body;

  if (!mount) {
    console.warn(
      `Luxurious animation container with id "${containerId}" not found. Animation skipped.`
    );
    return { stop: () => {}, finished: Promise.resolve() };
  }

  const TOTAL_DURATION = duration + (count - 1) * stagger;

  for (let i = 0; i < count; i++) {
    const video = document.createElement("video");
    video.src = videos[i % videos.length];
    video.muted = true;
    video.autoplay = true;
    // Loop so short WebM assets still show motion for the full payment/preview duration.
    video.loop = true;
    video.playsInline = true;

    Object.assign(video.style, {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: "350px",
      height: "350px",
      pointerEvents: "none",
      zIndex: "2147483647",
    });

    mount.appendChild(video);
    nodes.push(video);
    video.play().catch(() => {});

    const videoLife = TOTAL_DURATION - i * stagger;
    const anim = video.animate(
      [
        {
          transform: "translate(-50%, -50%) scale(0.86)",
          opacity: 0,
        },
        {
          transform: "translate(-50%, -50%) scale(1)",
          opacity: 1,
          offset: 0.085,
        },
        {
          transform: "translate(-50%, -50%) scale(1.012)",
          opacity: 1,
          offset: 0.38,
        },
        {
          transform: "translate(-50%, -50%) scale(1)",
          opacity: 1,
          offset: 0.52,
        },
        {
          transform: "translate(-50%, -50%) scale(1.012)",
          opacity: 1,
          offset: 0.68,
        },
        {
          transform: "translate(-50%, -50%) scale(1)",
          opacity: 1,
          offset: 0.9,
        },
        {
          transform: "translate(-50%, -50%) scale(0.9)",
          opacity: 0,
        },
      ],
      {
        duration: Math.max(videoLife, 1),
        delay: i * stagger,
        fill: "forwards",
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      }
    );
    entranceAnimations.push(anim);
  }

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
    entranceAnimations.forEach(a => a.cancel());
    entranceAnimations.length = 0;
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
