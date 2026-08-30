import { AnimationHandle } from "@/types/animation.types";
import { AnimationMode } from "@/lib/animationMode";

type FallingIcon = {
  el: HTMLImageElement;
  x: number;
  y: number;
  size: number;
  fallSpeed: number;
  driftSpeed: number;
  bornAt: number;
};

/* ───────────────────────────── */
/* Deterministic PRNG (LCG)       */
/* ───────────────────────────── */
function createRNG(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

export function fallStyle({
  icons = [],
  fallCount = 60,
  minSize = 30,
  maxSize = 90,
  speed = 1.6,
  drift = 1.4,
  duration = 6000,
  mode,
}: {
  icons: string[];
  fallCount?: number;
  minSize?: number;
  maxSize?: number;
  speed?: number;
  drift?: number;
  duration?: number;
  mode: AnimationMode;
}): AnimationHandle {
  if (!icons.length) {
    return { stop: () => {}, finished: Promise.resolve() };
  }

  const isPreview = mode === "preview";
  const TOTAL_DURATION = isPreview
    ? 4000
    : Math.min(Math.max(duration, 8000), 10000);

  const startTime = performance.now();
  const MIN_PAYMENT_LIFETIME = TOTAL_DURATION * 0.9;

  let stopped = false;
  let resolved = false;

  const active: FallingIcon[] = [];
  const timeouts: number[] = [];

  /* ───────── Overlay ───────── */
  const overlay = document.createElement("div");
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    pointerEvents: "none",
    overflow: "hidden",
    zIndex: "2147483600",
  });
  document.body.appendChild(overlay);

  const originWidth = window.innerWidth;
  const originTop = -100;

  /* ───────── Deterministic Setup ───────── */
  const rng = createRNG(Math.floor(startTime));

  const SCREEN_WIDTH = window.innerWidth;
  // Reduce number of simultaneously active icons for very wide screens
  const widthMultiplier = SCREEN_WIDTH > 2000 ? 0.5 : 1;

  const spawnInterval = isPreview ? 260 : 140;
  // const maxIcons = isPreview ? 14 : fallCount;
  const maxIcons = Math.floor((isPreview ? 14 : fallCount) * widthMultiplier);

  const spawnWindow = TOTAL_DURATION * (isPreview ? 0.7 : 0.85);

  const rawSpawnTimes: number[] = [];
  for (
    let t = 0;
    t < spawnWindow && rawSpawnTimes.length < maxIcons;
    t += spawnInterval
  ) {
    rawSpawnTimes.push(t);
  }

  const spawnTimes =
    !isPreview && spawnWindow > 0
      ? rawSpawnTimes.map(t => t * Math.pow(t / spawnWindow, 0.92))
      : rawSpawnTimes;

  let spawnIndex = 0;

  function spawnIcon(now: number) {
    if (stopped || spawnIndex >= spawnTimes.length) return;

    if (now - startTime < spawnTimes[spawnIndex]) return;

    spawnIndex++;

    const el = document.createElement("img");
    el.src = icons[Math.floor(rng() * icons.length)];

    const size = minSize + rng() * (maxSize - minSize);
    const x = rng() * (originWidth - size);
    const y = originTop - rng() * 200;

    Object.assign(el.style, {
      position: "fixed",
      left: "0",
      top: "0",
      width: `${size}px`,
      height: `${size}px`,
      pointerEvents: "none",
      opacity: "0",
      willChange: "transform, opacity",
      transform: `translate(${x}px, ${y}px)`,
    });

    overlay.appendChild(el);

    active.push({
      el,
      x,
      y,
      size,
      fallSpeed: speed + rng() * 0.8,
      driftSpeed: drift * (0.3 + rng() * 0.7) * (rng() < 0.5 ? -1 : 1),
      bornAt: now,
    });
  }

  /* ───────── RAF LOOP ───────── */
  let rafId = 0;
  function animate(now: number) {
    if (stopped) return;

    spawnIcon(now);

    const bottom = window.innerHeight + 140;

    for (let i = active.length - 1; i >= 0; i--) {
      const p = active[i];

      const depth = Math.min(Math.max(p.y / bottom, 0), 1);
      const accel = 1 + Math.pow(depth, 1.4) * 0.62;
      p.y += p.fallSpeed * accel;
      p.x += p.driftSpeed;

      const age = now - p.bornAt;
      const opacity = age < 300 ? Math.min(0.95, (age / 300) * 0.95) : 0.95;
      p.el.style.opacity = `${opacity}`;
      p.el.style.transform = `translate(${p.x}px, ${p.y}px)`;

      if (p.y > bottom) {
        p.el.remove();
        active.splice(i, 1);
      }
    }

    rafId = requestAnimationFrame(animate);
  }
  rafId = requestAnimationFrame(animate);

  /* ───────── Cleanup ───────── */
  function cleanup() {
    if (stopped) return;
    stopped = true;
    timeouts.forEach(clearTimeout);
    cancelAnimationFrame(rafId);
    active.forEach(p => p.el.remove());
    active.length = 0;
    overlay.remove();
  }

  /* ───────── Finish ───────── */
  const finished = new Promise<void>(resolve => {
    const t = window.setTimeout(() => {
      cleanup();
      if (!resolved) {
        resolved = true;
        resolve();
      }
    }, TOTAL_DURATION + 500);
    timeouts.push(t);
  });

  function stop() {
    if (stopped) return;

    if (
      mode === "payment" &&
      performance.now() - startTime < MIN_PAYMENT_LIFETIME
    ) {
      return;
    }

    cleanup();
  }

  return { stop, finished };
}
