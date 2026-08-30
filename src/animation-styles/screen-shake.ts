import { AnimationMode } from "@/lib/animationMode";
import { AnimationHandle } from "@/types/animation.types";

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
  const isFullscreenMount =
    mount === document.body || mount === document.documentElement;

  // Per-instance overlay — do not remove other concurrent instances.
  const overlay = document.createElement("div");
  overlay.id = `icon-shake-overlay-${Math.random().toString(36).slice(2, 11)}`;
  overlay.classList.add("icon-shake-overlay");

  Object.assign(overlay.style, {
    // Full-document mount must stay `fixed` and must not coerce `body` to
    // `position: relative` — that breaks Vaul/fixed drawers and can reflow the page.
    position: isFullscreenMount ? "fixed" : "absolute",
    inset: "0",
    pointerEvents: "none",
    zIndex: "2147483647",
  });

  overlay.dataset.glow = glowOrigin;
  mount.appendChild(overlay);

  if (isFullscreenMount) {
    overlay.classList.add("fullscreen");
  } else {
    if (getComputedStyle(mount).position === "static") {
      mount.style.position = "relative";
    }
    overlay.classList.add("scoped");
  }

  const uniqueIcons = Array.from(new Set(icons));

  let placed = 0;
  let row = 0;

  const minIconsPerRow = 3;
  const maxIconsPerRow = 4;
  const rowSpacing = 15;
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

      // :white_check_mark: KEEP CLASS (visual styling lives here)
      img.className = "shake-icon";

      // :white_check_mark: RESTORED: single assignment only
      const left = Math.random() * 90 + 5;
      const top = startY - row * rowSpacing;

      Object.assign(img.style, {
        position: "absolute",
        width: "96px",
        height: "96px",
        left: `${left}%`,
        top: `${top}%`,
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

      const opacity =
        progress > 0.85 ? 1 - Math.pow((progress - 0.85) / 0.15, 0.6) : 1;
      overlay.style.opacity = `${opacity}`;

      // :white_check_mark: SAME decay curve
      const decay =
        progress < 0.75 ? 0.85 : 0.85 * (1 - (progress - 0.75) / 0.25);

      // Ramp amplitude in first ~20% — eased so shake "charges" before full punch
      const introRamp = progress < 0.2 ? Math.pow(progress / 0.2, 1.6) : 1;
      const shakeMul = decay * introRamp;

      const x = Math.sin(elapsed * 0.02) * intensity * shakeMul;
      const y = Math.cos(elapsed * 0.0173) * intensity * shakeMul;

      overlay.style.transform = `translate(${x}px, ${y}px)`;

      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      } else {
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

    if (!isPreview && elapsed < MIN_PAYMENT_LIFETIME) return;

    if (stopped) return;
    stopped = true;
    cleanup();
  }

  return { stop, finished: finishedPromise, rootElement: overlay };
}
