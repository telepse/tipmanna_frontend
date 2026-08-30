import { AnimationHandle } from "@/types/animation.types";
import { AnimationMode } from "@/lib/animationMode";

const Z = "2147483657";

type Segment = {
  el: HTMLImageElement;
  index: number;
};

type Ember = {
  el: HTMLDivElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  born: number;
};

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Smooth coiled path centered on (cx, cy), bounded within roughly `scale` px.
 * Parameter `u` advances along the snake (head moves forward in u over time).
 */
function dragonPathPoint(
  u: number,
  cx: number,
  cy: number,
  scale: number,
  wobble: number
): { x: number; y: number } {
  const coil = Math.sin(u * 2.15 + wobble * 0.02) * Math.cos(u * 1.05 + 0.4);
  const x =
    cx +
    scale *
      (0.5 * Math.sin(u * 1.12 + coil * 0.42) +
        0.14 * Math.sin(u * 3.05 + 0.6) +
        0.06 * Math.sin(u * 5.1));
  const y =
    cy +
    scale *
      (0.46 * Math.cos(u * 1.08 - coil * 0.38) +
        0.12 * Math.cos(u * 2.85 - 0.3) +
        0.07 * Math.sin(u * 4.4));
  return { x, y };
}

export function dragonSpiralStyle({
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
  });
  document.body.appendChild(overlay);

  const count = isPreview ? 7 : 12;
  const segments: Segment[] = [];
  const embers: Ember[] = [];
  let lastFireAt = 0;

  const maxEmbers = isPreview ? 10 : 22;
  const fireIntervalMs = isPreview ? 520 : 340;

  /** Phase lag per segment index (follow-the-leader). */
  const segmentLag = isPreview ? 0.52 : 0.44;
  const headSpeed = isPreview ? 0.00185 : 0.00235;

  for (let i = 0; i < count; i++) {
    const el = document.createElement("img");
    el.src = icons[i % icons.length] || icons[0]!;
    const sz = isPreview ? 58 : 68;
    Object.assign(el.style, {
      position: "absolute",
      width: `${sz}px`,
      height: `${sz}px`,
      left: "0",
      top: "0",
      pointerEvents: "none",
      willChange: "transform, opacity, filter",
    });
    overlay.appendChild(el);
    segments.push({ el, index: i });
  }

  let resolveFinished: (() => void) | null = null;
  const finished = new Promise<void>(r => {
    resolveFinished = r;
  });

  function spawnFire(
    cx: number,
    cy: number,
    fromX: number,
    fromY: number,
    seed: number
  ) {
    if (embers.length >= maxEmbers || stopped) return;
    const n = isPreview ? 2 : 3;
    const baseAng = Math.atan2(fromY - cy, fromX - cx);
    for (let k = 0; k < n; k++) {
      const el = document.createElement("div");
      const w = 10 + (k % 2) * 6;
      el.style.cssText = [
        "position:absolute",
        "left:0",
        "top:0",
        `width:${w}px`,
        `height:${w}px`,
        "border-radius:50%",
        "pointer-events:none",
        "will-change:transform,opacity",
        "background:radial-gradient(circle at 30% 30%,rgba(255,248,220,0.95),rgba(255,120,40,0.65) 40%,rgba(180,30,10,0.25) 68%,transparent 72%)",
        `filter:blur(${isPreview ? 0.5 : 0.8}px)`,
      ].join(";");
      overlay.appendChild(el);
      const spread = (seed * 0.17 + k * 0.61) % 1;
      const ang = baseAng + (spread - 0.5) * 0.95;
      const speed = (isPreview ? 1.1 : 1.55) + k * 0.35;
      embers.push({
        el,
        x: fromX,
        y: fromY,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        born: performance.now(),
      });
    }
  }

  function cleanup() {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(rafId);
    embers.forEach(e => e.el.remove());
    embers.length = 0;
    segments.forEach(s => s.el.remove());
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
    const minDim = Math.min(window.innerWidth, window.innerHeight);
    const maxR = minDim * (isPreview ? 0.32 : 0.38);

    const grow = smoothstep(0, duration * (isPreview ? 0.38 : 0.32), elapsed);
    const breath = 1 + 0.065 * Math.sin(elapsed * 0.0038);
    const breathSlow = 1 + 0.035 * Math.sin(elapsed * 0.0021);
    const scale = maxR * grow * breath;

    const headU = elapsed * headSpeed;
    const wobble = elapsed * 0.0011;

    function segmentXY(i: number): {
      x: number;
      y: number;
      u: number;
      headEase: number;
      rotDeg: number;
    } {
      const uNorm = count > 1 ? i / (count - 1) : 0;
      const u = Math.max(0, headU - i * segmentLag);
      const p0 = dragonPathPoint(
        u,
        cx,
        cy,
        scale * breathSlow,
        wobble + i * 0.7
      );
      const p1 = dragonPathPoint(
        u + 0.055,
        cx,
        cy,
        scale * breathSlow,
        wobble + i * 0.7
      );
      const rotDeg = (Math.atan2(p1.y - p0.y, p1.x - p0.x) * 180) / Math.PI;
      const headEase = smoothstep(
        0,
        duration * 0.12,
        elapsed - i * (isPreview ? 45 : 38)
      );
      return { x: p0.x, y: p0.y, u: uNorm, headEase, rotDeg };
    }

    for (let s = 0; s < segments.length; s++) {
      const seg = segments[s]!;
      const i = seg.index;
      const { x, y, u, headEase, rotDeg } = segmentXY(i);

      const opBase = 0.15 + 0.85 * headEase;
      let op = opBase;
      if (t > 0.9) op *= (1 - t) / 0.1;

      const scaleSeg = 0.88 + 0.12 * breathSlow + (1 - u) * 0.06;

      seg.el.style.opacity = `${Math.max(0, Math.min(1, op))}`;
      seg.el.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%) rotate(${rotDeg}deg) scale(${scaleSeg})`;

      const emberGlow = 6 + 10 * Math.sin(elapsed * 0.003 + i);
      const coreWarm = 0.35 + 0.35 * Math.sin(elapsed * 0.0038 + u * Math.PI);
      seg.el.style.filter = [
        `drop-shadow(0 0 ${emberGlow}px rgba(255,90,30,${0.35 + coreWarm * 0.35}))`,
        `drop-shadow(0 0 ${4 + u * 6}px rgba(255,200,100,${0.25 + coreWarm * 0.3}))`,
      ].join(" ");
    }

    if (now - lastFireAt > fireIntervalMs && grow > 0.35 && t < 0.92) {
      lastFireAt = now;
      const head = dragonPathPoint(headU, cx, cy, scale * breathSlow, wobble);
      spawnFire(cx, cy, head.x, head.y, elapsed * 0.0007);
    }

    const nowMs = performance.now();
    for (let e = embers.length - 1; e >= 0; e--) {
      const em = embers[e]!;
      const age = nowMs - em.born;
      const life = isPreview ? 380 : 480;
      if (age > life) {
        em.el.remove();
        embers.splice(e, 1);
        continue;
      }
      const uu = age / life;
      em.x += em.vx * 1.1;
      em.y += em.vy * 1.1;
      em.vy -= 0.04;
      em.vx *= 0.985;
      em.el.style.opacity = `${(1 - uu) * (1 - uu) * 0.95}`;
      em.el.style.transform = `translate(${em.x}px,${em.y}px) translate(-50%,-50%) scale(${1 + uu * 1.2})`;
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
