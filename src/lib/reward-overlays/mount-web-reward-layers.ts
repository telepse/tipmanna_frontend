import type { TipAnimationEvent } from "@/lib/animation-guard";
import { computeBundleOverlayDurationMs } from "./bundle-duration";

/** Below Luxurious video z-index (2147483647), above most app UI. */
const Z_REWARD_LAYER = 2147483600;

const TURBO_BLUE = "#f57d11";
const GALAXY_ORANGE = "#7aadcc";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type Streak = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  w: number;
};

function mountTurboLayer(
  host: HTMLElement,
  durationMs: number,
  seed: number
): () => void {
  const canvas = document.createElement("canvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.cssText = `position:absolute;inset:0;width:100%;height:100%;pointer-events:none`;
  host.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => canvas.remove();

  const reduced = prefersReducedMotion();
  const rnd = (function makeRng(s: number) {
    return () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
  })(Math.floor(seed) % 100000);

  const streaks: Streak[] = [];
  const n = reduced ? 24 : 72;
  for (let i = 0; i < n; i++) {
    streaks.push({
      x: rnd() * canvas.width,
      y: rnd() * canvas.height,
      vx: (rnd() - 0.5) * (reduced ? 2 : 6),
      vy: (rnd() - 0.5) * (reduced ? 2 : 6),
      life: rnd(),
      w: 2 + rnd() * 4,
    });
  }

  let raf = 0;
  const start = performance.now();
  const tick = () => {
    const elapsed = performance.now() - start;
    if (elapsed >= durationMs) {
      canvas.remove();
      return;
    }
    const t = elapsed / durationMs;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const s of streaks) {
      if (reduced) {
        s.x += s.vx * 0.5;
        s.y += s.vy * 0.5;
      } else {
        s.vx += (rnd() - 0.5) * 2.2;
        s.vy += (rnd() - 0.5) * 2.2;
        s.vx *= 0.985;
        s.vy *= 0.985;
        s.x += s.vx;
        s.y += s.vy;
      }
      if (s.x < -40) s.x = canvas.width + 40;
      if (s.x > canvas.width + 40) s.x = -40;
      if (s.y < -40) s.y = canvas.height + 40;
      if (s.y > canvas.height + 40) s.y = -40;

      const alpha = (0.12 + s.life * 0.35) * (1 - t * 0.3);
      ctx.strokeStyle = TURBO_BLUE;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = s.w;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - s.vx * 6, s.y - s.vy * 6);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  const onResize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  window.addEventListener("resize", onResize);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", onResize);
    canvas.remove();
  };
}

function mountGalaxyLayer(
  host: HTMLElement,
  durationMs: number,
  seed: number
): () => void {
  const flame = (edge: "top" | "bottom" | "left" | "right") => {
    const el = document.createElement("div");
    const gradient =
      edge === "top" || edge === "bottom"
        ? `linear-gradient(${edge === "top" ? "to bottom" : "to top"}, rgba(122, 173, 204, 0.55), transparent)`
        : `linear-gradient(${edge === "left" ? "to right" : "to left"}, rgba(122, 173, 204, 1.00), transparent)`;
    const pos =
      edge === "top"
        ? "top:0;left:0;right:0;height:18vh"
        : edge === "bottom"
          ? "bottom:0;left:0;right:0;height:18vh"
          : edge === "left"
            ? "top:0;bottom:0;left:0;width:14vw"
            : "top:0;bottom:0;right:0;width:14vw";
    el.style.cssText = `position:absolute;${pos};pointer-events:none;background:${gradient};`;
    host.appendChild(el);
    return el;
  };

  const edges = [flame("top"), flame("bottom"), flame("left"), flame("right")];

  const canvas = document.createElement("canvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.cssText =
    "position:absolute;inset:0;width:100%;height:100%;pointer-events:none";
  host.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return () => edges.forEach(e => e.remove());
  }

  const rnd = (function makeRng(s: number) {
    return () => {
      s = (s * 48271) % 2147483647;
      return s / 2147483647;
    };
  })(Math.floor(seed / 2) % 99991);

  const stars = Array.from({ length: 80 }, () => ({
    x: rnd(),
    y: rnd() * 0.35,
    r: 0.5 + rnd() * 1.5,
    tw: rnd() * Math.PI * 2,
  }));

  let raf = 0;
  const start = performance.now();
  const reduced = prefersReducedMotion();

  const tick = () => {
    const elapsed = performance.now() - start;
    if (elapsed >= durationMs) {
      edges.forEach(e => e.remove());
      canvas.remove();
      return;
    }
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const pulse = reduced ? 0.25 : 0.18 + 0.08 * Math.sin(elapsed * 0.003);
    for (const e of edges) {
      e.style.opacity = String(0.65 + pulse);
    }

    const cy = h * 0.42;
    const gateW = Math.min(w, h) * 0.28;
    const leftCx = w * 0.32;
    const rightCx = w * 0.68;

    ctx.strokeStyle = GALAXY_ORANGE;
    ctx.lineWidth = 4;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(leftCx, cy, gateW, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(rightCx, cy, gateW, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.globalAlpha = 0.35;
    for (const s of stars) {
      const twinkle = 0.5 + 0.5 * Math.sin(elapsed * 0.004 + s.tw);
      ctx.globalAlpha = 0.2 * twinkle;
      ctx.beginPath();
      ctx.arc(s.x * w, s.y * h, s.r * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  const onResize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  window.addEventListener("resize", onResize);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", onResize);
    edges.forEach(e => e.remove());
    canvas.remove();
  };
}

let paymentCleanup: (() => void) | null = null;
let previewRewardCleanup: (() => void) | null = null;

const DRAWER_TURBO_CLASS = "tip-drawer-turbo-preview-active";

/**
 * Full-screen payment companions; stops any previous payment companions first.
 */
export function startPaymentRewardOverlays(
  data: TipAnimationEvent,
  mount?: HTMLElement
): void {
  paymentCleanup?.();
  paymentCleanup = null;

  if (!data.rewardTurbo && !data.rewardGalaxy) return;

  const root = mount ?? document.body;
  const durationMs = computeBundleOverlayDurationMs(data);
  const host = document.createElement("div");
  host.setAttribute("data-tip-reward-overlay", "payment");
  host.style.cssText = `position:fixed;inset:0;z-index:${Z_REWARD_LAYER};pointer-events:none;overflow:hidden`;
  root.appendChild(host);

  const cleanups: (() => void)[] = [];
  if (data.rewardGalaxy) {
    cleanups.push(mountGalaxyLayer(host, durationMs, data.serverTs));
  }
  if (data.rewardTurbo) {
    cleanups.push(mountTurboLayer(host, durationMs, data.serverTs + 1));
  }

  const t = window.setTimeout(() => {
    paymentCleanup?.();
  }, durationMs + 80);

  paymentCleanup = () => {
    clearTimeout(t);
    cleanups.forEach(c => c());
    host.remove();
    paymentCleanup = null;
  };
}

export function stopPaymentRewardOverlays(): void {
  paymentCleanup?.();
}

export function attachPreviewRewardLayers(opts: {
  turbo: boolean;
  galaxy: boolean;
  durationMs: number;
  serverTs: number;
  mount?: HTMLElement;
  drawerTintRoot?: HTMLElement | null;
}): () => void {
  detachPreviewRewardLayers();

  const { turbo, galaxy, durationMs, serverTs, mount, drawerTintRoot } = opts;
  if (!turbo && !galaxy) return () => {};

  if (turbo && drawerTintRoot) {
    drawerTintRoot.classList.add(DRAWER_TURBO_CLASS);
  }

  const root = mount ?? document.body;
  const host = document.createElement("div");
  host.setAttribute("data-tip-reward-overlay", "preview");
  host.style.cssText = `position:fixed;inset:0;z-index:${Z_REWARD_LAYER};pointer-events:none;overflow:hidden`;
  root.appendChild(host);

  const cleanups: (() => void)[] = [];
  if (galaxy) cleanups.push(mountGalaxyLayer(host, durationMs, serverTs));
  if (turbo) cleanups.push(mountTurboLayer(host, durationMs, serverTs + 1));

  const t = window.setTimeout(
    () => detachPreviewRewardLayers(),
    durationMs + 80
  );

  previewRewardCleanup = () => {
    clearTimeout(t);
    cleanups.forEach(c => c());
    host.remove();
    drawerTintRoot?.classList.remove(DRAWER_TURBO_CLASS);
    previewRewardCleanup = null;
  };

  return previewRewardCleanup;
}

export function detachPreviewRewardLayers(): void {
  previewRewardCleanup?.();
}
