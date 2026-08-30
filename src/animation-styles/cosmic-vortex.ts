import { AnimationHandle } from "@/types/animation.types";
import { AnimationMode } from "@/lib/animationMode";

const Z = "2147483658";

type LayerOrb = {
  el: HTMLImageElement;
  layer: number;
  slot: number;
  slotsOnLayer: number;
  /** 1 or -1 spin */
  dir: 1 | -1;
  /** base radius as fraction of half min dimension */
  rFrac: number;
  /** angular speed scalar */
  speedMul: number;
};

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function cosmicVortexStyle({
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
  let rafId = 0;

  const overlay = document.createElement("div");
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    pointerEvents: "none",
    zIndex: Z,
    // Dark inward pull at center only — no band / "milky way" across the view
    background:
      "radial-gradient(circle at 50% 50%, rgba(8,10,28,0.72) 0%, rgba(15,20,55,0.22) 22%, transparent 48%)",
  });
  document.body.appendChild(overlay);

  const orbs: LayerOrb[] = [];

  // Three concentric layers: miniature galaxy disks, counter-rotating for depth
  const layers: {
    n: number;
    rFrac: number;
    size: number;
    dir: 1 | -1;
    mul: number;
  }[] = isPreview
    ? [
        { n: 5, rFrac: 0.2, size: 52, dir: 1, mul: 1.35 },
        { n: 6, rFrac: 0.34, size: 44, dir: -1, mul: 1.0 },
      ]
    : [
        { n: 6, rFrac: 0.18, size: 56, dir: 1, mul: 1.45 },
        { n: 7, rFrac: 0.3, size: 48, dir: -1, mul: 1.15 },
        { n: 8, rFrac: 0.42, size: 40, dir: 1, mul: 0.92 },
      ];

  let idx = 0;
  for (let layerIdx = 0; layerIdx < layers.length; layerIdx++) {
    const L = layers[layerIdx]!;
    for (let s = 0; s < L.n; s++) {
      const el = document.createElement("img");
      el.src = icons[idx % icons.length]!;
      idx++;
      Object.assign(el.style, {
        position: "absolute",
        width: `${L.size}px`,
        height: `${L.size}px`,
        left: "0",
        top: "0",
        pointerEvents: "none",
        willChange: "transform, opacity, filter",
      });
      overlay.appendChild(el);
      orbs.push({
        el,
        layer: layerIdx,
        slot: s,
        slotsOnLayer: L.n,
        dir: L.dir,
        rFrac: L.rFrac,
        speedMul: L.mul,
      });
    }
  }

  let resolveFinished: (() => void) | null = null;
  const finished = new Promise<void>(r => {
    resolveFinished = r;
  });

  function cleanup() {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(rafId);
    orbs.forEach(o => o.el.remove());
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

  function frame(now: number) {
    if (stopped) return;
    const elapsed = now - startTime;
    const t = Math.min(elapsed / duration, 1);

    const cx = window.innerWidth * 0.5;
    const cy = window.innerHeight * 0.5;
    const half = Math.min(window.innerWidth, window.innerHeight) * 0.5;

    // Inward pull: orbits shrink toward the core (clear "drawn into center" read)
    const pull = smoothstep(0, duration * 0.85, elapsed);
    const pullCurve =
      0.38 * (1 - Math.exp(-3.1 * pull)) + 0.06 * Math.sin(elapsed * 0.0019);

    const baseSpin = isPreview ? 0.00135 : 0.00175;

    for (const o of orbs) {
      const slotAng = (o.slot / o.slotsOnLayer) * Math.PI * 2;
      const ang =
        slotAng +
        elapsed * baseSpin * o.speedMul * o.dir * (1 + o.layer * 0.12) +
        t * Math.PI * 0.35 * o.dir;

      const wobbleR =
        1 + 0.028 * Math.sin(elapsed * 0.0024 + o.layer * 1.7 + o.slot * 0.44);
      const r =
        half * o.rFrac * wobbleR * (1 - pullCurve * (0.92 - o.layer * 0.06));

      const spiralIn =
        0.04 * Math.sin(ang * 2 + elapsed * 0.0011) * (1 - t * 0.35);

      const x = cx + Math.cos(ang + spiralIn) * r;
      const y = cy + Math.sin(ang + spiralIn) * r;

      let op = 0.18 + 0.82 * smoothstep(0, duration * 0.08, elapsed);
      if (t > 0.88) op *= (1 - t) / 0.12;

      const intensity = 0.55 + 0.45 * Math.sin(elapsed * 0.0028 + o.slot * 0.5);
      const hueShift = o.layer % 2 === 0 ? "180,100,255" : "260,160,255";

      o.el.style.opacity = `${Math.max(0, op)}`;
      o.el.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%) rotate(${elapsed * 0.035 * o.dir * (0.8 + o.layer * 0.1)}deg)`;
      o.el.style.filter = [
        `drop-shadow(0 0 ${14 + intensity * 12}px rgba(${hueShift},${0.38 + intensity * 0.28}))`,
        `drop-shadow(0 0 ${6 + o.layer * 4}px rgba(100,200,255,${0.22 + intensity * 0.2}))`,
      ].join(" ");
    }

    if (elapsed < duration) {
      rafId = requestAnimationFrame(frame);
    } else {
      cleanup();
    }
  }

  rafId = requestAnimationFrame(frame);

  return { stop, finished };
}
