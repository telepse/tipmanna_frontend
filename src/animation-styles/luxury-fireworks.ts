import { AnimationHandle } from "@/types/animation.types";
import { AnimationMode } from "@/lib/animationMode";

const Z = "2147483656";

function burstAt(
  overlay: HTMLElement,
  icons: string[],
  originX: number,
  originY: number,
  particleCount: number,
  spread: number,
  flightMs: number
) {
  const src = icons;
  for (let i = 0; i < particleCount; i++) {
    const p = document.createElement("img");
    p.src = src[i % src.length];
    const sz = 28 + (i % 4) * 14;
    Object.assign(p.style, {
      position: "absolute",
      left: `${originX}px`,
      top: `${originY}px`,
      width: `${sz}px`,
      height: `${sz}px`,
      transform: "translate(-50%, -50%)",
      pointerEvents: "none",
      willChange: "transform, opacity",
      filter: "drop-shadow(0 0 8px rgba(255,220,120,0.85))",
    });
    overlay.appendChild(p);

    const angle = (i / particleCount) * Math.PI * 2 + i * 0.08;
    const dist = spread * (0.75 + ((i * 0.07) % 1) * 0.5);
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;

    p.animate(
      [
        {
          transform: "translate(-50%, -50%) scale(0.35)",
          opacity: 1,
        },
        {
          transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1.05)`,
          opacity: 0.92,
          offset: 0.42,
        },
        {
          transform: `translate(calc(-50% + ${dx * 1.15}px), calc(-50% + ${dy * 1.15}px)) scale(0.2)`,
          opacity: 0,
        },
      ],
      {
        duration: flightMs,
        easing: "cubic-bezier(0.12, 0.82, 0.24, 1)",
        fill: "forwards",
      }
    ).finished.then(() => p.remove());
  }
}

export function luxuryFireworksStyle({
  icons,
  duration,
  mode,
}: {
  icons: string[];
  duration: number;
  mode: AnimationMode;
}): AnimationHandle {
  if (!icons.length) {
    return { stop: () => {}, finished: Promise.resolve() };
  }

  const isPreview = mode === "preview";
  const MIN_PAYMENT_LIFETIME = duration * 0.85;
  const startTime = performance.now();
  let stopped = false;
  const timeouts: number[] = [];

  const overlay = document.createElement("div");
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    pointerEvents: "none",
    zIndex: Z,
  });
  document.body.appendChild(overlay);

  let resolveFinished: (() => void) | null = null;
  const finished = new Promise<void>(r => {
    resolveFinished = r;
  });

  const w = window.innerWidth;
  const h = window.innerHeight;

  function scheduleBurst(
    delay: number,
    ox: number,
    oy: number,
    n: number,
    spread: number,
    flight: number
  ) {
    timeouts.push(
      window.setTimeout(() => {
        if (stopped) return;
        burstAt(overlay, icons, ox, oy, n, spread, flight);
      }, delay)
    );
  }

  if (isPreview) {
    scheduleBurst(
      120,
      w * 0.5,
      h * 0.35,
      24,
      160,
      Math.min(2200, duration * 0.55)
    );
    scheduleBurst(
      900,
      w * 0.62,
      h * 0.42,
      18,
      120,
      Math.min(1800, duration * 0.5)
    );
  } else {
    scheduleBurst(0, w * 0.22, h * 0.38, 28, 200, 2400);
    scheduleBurst(duration * 0.22, w * 0.78, h * 0.36, 32, 220, 2600);
    scheduleBurst(duration * 0.45, w * 0.5, h * 0.32, 36, 260, 2800);
    scheduleBurst(
      duration * 0.68,
      w * 0.5,
      h * 0.4,
      44,
      Math.min(320, w * 0.18),
      3200
    );
  }

  function cleanup() {
    if (stopped) return;
    stopped = true;
    timeouts.forEach(clearTimeout);
    timeouts.length = 0;
    overlay.replaceChildren();
    overlay.remove();
    resolveFinished?.();
    resolveFinished = null;
  }

  function stop() {
    if (stopped) return;
    if (!isPreview && performance.now() - startTime < MIN_PAYMENT_LIFETIME) {
      return;
    }
    cleanup();
  }

  timeouts.push(window.setTimeout(() => cleanup(), duration));

  return { stop, finished };
}
