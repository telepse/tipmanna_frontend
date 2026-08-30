import { AnimationHandle } from "@/types/animation.types";
import { AnimationMode } from "@/lib/animationMode";

const Z = "2147483655";

type Drop = {
  el: HTMLImageElement;
  x: number;
  y: number;
  vy: number;
  vx: number;
  born: number;
  rot: number;
  vr: number;
  w: number;
};

export function goldRainStyle({
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
    overflow: "hidden",
  });
  document.body.appendChild(overlay);

  const drops: Drop[] = [];
  const count = isPreview ? 16 : 52;
  const spawnWindow = duration * 0.5;
  const vw = typeof window !== "undefined" ? window.innerWidth : 800;

  for (let i = 0; i < count; i++) {
    const el = document.createElement("img");
    el.src = icons[i % icons.length];
    const w = isPreview ? 34 : 40 + (i % 6) * 6;
    Object.assign(el.style, {
      position: "absolute",
      width: `${w}px`,
      height: `${w}px`,
      left: "0",
      top: "0",
      pointerEvents: "none",
      willChange: "transform, opacity, filter",
    });
    overlay.appendChild(el);

    const u = (i * 0.3819660112501051) % 1;
    drops.push({
      el,
      x: u * vw,
      y: -50 - (i % 14) * 22,
      vy: 1.1 + (i % 8) * 0.28,
      vx: Math.sin(i * 0.73) * 1.1,
      born: (i / Math.max(count, 1)) * spawnWindow * 0.92,
      rot: (i * 37) % 360,
      vr: 1.2 + (i % 6) * 0.35,
      w,
    });
  }

  let crescendoTriggered = false;
  let resolveFinished: (() => void) | null = null;
  const finished = new Promise<void>(r => {
    resolveFinished = r;
  });

  function cleanup() {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(rafId);
    drops.forEach(d => d.el.remove());
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

    if (!isPreview && !crescendoTriggered && t > 0.72) {
      crescendoTriggered = true;
      for (let j = 0; j < 12; j++) {
        const el = document.createElement("img");
        el.src = icons[j % icons.length];
        const w = 32;
        Object.assign(el.style, {
          position: "absolute",
          width: `${w}px`,
          height: `${w}px`,
          left: `${((j * 0.17) % 1) * vw}px`,
          top: "-30px",
          pointerEvents: "none",
          willChange: "transform, opacity",
          filter: "drop-shadow(0 0 12px rgba(255,215,0,0.9))",
        });
        overlay.appendChild(el);
        drops.push({
          el,
          x: ((j * 0.17) % 1) * vw,
          y: -30,
          vy: 2.4,
          vx: (j % 2 === 0 ? 1 : -1) * 0.6,
          born: elapsed,
          rot: 0,
          vr: 2,
          w,
        });
      }
    }

    for (const d of drops) {
      if (elapsed < d.born) {
        d.el.style.opacity = "0";
        continue;
      }
      const local = elapsed - d.born;
      d.y += d.vy * (0.45 + local * 0.0018);
      d.x += d.vx + Math.sin(local * 0.008) * 0.45;
      d.vy += 0.055;
      d.rot += d.vr;

      const fadeIn = Math.min(1, local / 380);
      let op = fadeIn;
      if (t > 0.9) op *= Math.max(0, (1 - t) / 0.1);

      d.el.style.opacity = `${op}`;
      d.el.style.transform = `translate(${d.x}px, ${d.y}px) rotate(${d.rot}deg) translate(-50%, -50%)`;
      if (!isPreview && t > 0.25) {
        const glow = Math.min(1, (t - 0.25) / 0.35);
        d.el.style.filter = `drop-shadow(0 0 ${6 + glow * 10}px rgba(255,215,0,${0.45 + glow * 0.45}))`;
      } else {
        d.el.style.filter = "";
      }
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
