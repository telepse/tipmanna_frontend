import { AnimationHandle } from "@/types/animation.types";
import { AnimationMode } from "@/lib/animationMode";

export function burstStyle({
  icons = [],
  particleIcons = [],
  particleCount = 18,
  particleSize = 100,
  coreSize = 120,
  spread = 140,
  duration = 9000,
  symmetrical = true,
  mode,
}: {
  icons: string[];
  particleIcons?: string[];
  particleCount?: number;
  particleSize?: number;
  coreSize?: number;
  spread?: number;
  duration?: number;
  symmetrical?: boolean;
  mode: AnimationMode;
}): AnimationHandle {
  if (!icons.length) {
    return { stop: () => {}, finished: Promise.resolve() };
  }

  const nodes: HTMLElement[] = [];
  const timeouts: ReturnType<typeof setTimeout>[] = [];
  const animations: Animation[] = [];

  let stopped = false;
  let cleaned = false;

  // 🔒 CRITICAL WINDOW — payment cannot be killed before this
  const MIN_PAYMENT_LIFETIME = duration * 0.85;
  const startTime = performance.now();

  const originX = window.innerWidth / 2;
  const originY = window.innerHeight / 2;

  // ---------- OVERLAY ----------
  const overlay = document.createElement("div");
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    pointerEvents: "none",
    zIndex: "2147483660",
  });
  document.body.appendChild(overlay);
  nodes.push(overlay);

  // ---------- CORE ----------
  const core = document.createElement("img");
  core.src = icons[0];
  Object.assign(core.style, {
    position: "absolute",
    left: `${originX}px`,
    top: `${originY}px`,
    width: `${coreSize}px`,
    height: `${coreSize}px`,
    transform: "translate(-50%, -50%) scale(0.6)",
    filter: "drop-shadow(0 0 0 rgba(255,255,255,0))",
  });
  overlay.appendChild(core);
  nodes.push(core);

  animations.push(
    core.animate(
      [
        {
          transform: "translate(-50%, -50%) scale(0.6)",
          filter: "drop-shadow(0 0 0 rgba(255,255,255,0))",
        },
        {
          transform: "translate(-50%, -50%) scale(1.3)",
          filter: "drop-shadow(0 0 32px rgba(255,255,255,1))",
        },
        {
          transform: "translate(-50%, -50%) scale(1)",
          filter: "drop-shadow(0 0 18px rgba(255,255,255,0.7))",
        },
      ],
      {
        duration: duration * 0.18,
        easing: "cubic-bezier(.15,.85,.3,1)",
        fill: "forwards",
      }
    )
  );

  // ---------- RING ----------
  function spawnRing(scale: number, opacity: number, life = duration * 0.35) {
    if (stopped) return;

    const ring = document.createElement("div");
    Object.assign(ring.style, {
      position: "absolute",
      left: `${originX}px`,
      top: `${originY}px`,
      width: "26px",
      height: "26px",
      borderRadius: "50%",
      border: "2px solid rgba(255,255,255,0.8)",
      transform: "translate(-50%, -50%) scale(0)",
      opacity,
    });

    overlay.appendChild(ring);
    nodes.push(ring);

    animations.push(
      ring.animate(
        [
          { transform: "translate(-50%, -50%) scale(0)", opacity },
          { transform: `translate(-50%, -50%) scale(${scale})`, opacity: 0 },
        ],
        { duration: life, easing: "ease-out", fill: "forwards" }
      )
    );

    timeouts.push(setTimeout(() => ring.remove(), life + 50));
  }

  spawnRing(6, 0.9);

  // ---------- PARTICLES ----------
  const sources = particleIcons.length ? particleIcons : icons;

  function spawnParticles(count: number, multiplier: number) {
    if (stopped) return;

    for (let i = 0; i < count; i++) {
      const p = document.createElement("img");
      p.src = sources[i % sources.length];
      Object.assign(p.style, {
        position: "absolute",
        left: `${originX}px`,
        top: `${originY}px`,
        width: `${particleSize}px`,
        height: `${particleSize}px`,
        transform: "translate(-50%, -50%) scale(0.4)",
      });

      const angle = symmetrical
        ? (i % 2 === 0 ? Math.PI * 0.75 : Math.PI * 0.25) +
          (Math.random() - 0.5) * 0.4
        : Math.random() * Math.PI * 2;

      const dist = spread * multiplier * (0.8 + Math.random() * 0.6);
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist;

      animations.push(
        p.animate(
          [
            { transform: "translate(-50%, -50%) scale(0.4)", opacity: 1 },
            {
              transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1.1)`,
              opacity: 0,
            },
          ],
          {
            duration: duration * 0.55,
            easing: "cubic-bezier(.25,.9,.35,1)",
            fill: "forwards",
          }
        )
      );

      overlay.appendChild(p);
      nodes.push(p);
      timeouts.push(setTimeout(() => p.remove(), duration * 0.6));
    }
  }

  spawnParticles(particleCount, 1);

  const isPreview = mode === "preview";

  // ---------- MID ESCALATION ----------
  if (!isPreview) {
    timeouts.push(
      setTimeout(() => {
        if (stopped) return;
        spawnRing(4.5, 0.6);
        spawnParticles(Math.floor(particleCount * 0.7), 0.6);
      }, duration * 0.45)
    );
  }

  // ---------- SUSTAIN ----------
  if (!isPreview) {
    const pulse = core.animate(
      [
        { filter: "drop-shadow(0 0 16px rgba(255,255,255,0.6))" },
        { filter: "drop-shadow(0 0 26px rgba(255,255,255,1))" },
        { filter: "drop-shadow(0 0 16px rgba(255,255,255,0.6))" },
      ],
      { duration: 1600, iterations: Infinity, easing: "ease-in-out" }
    );

    animations.push(pulse);
    timeouts.push(setTimeout(() => pulse.cancel(), duration * 0.88));
  }

  const finished = new Promise<void>(resolve => {
    timeouts.push(
      setTimeout(() => {
        cleanup();
        resolve();
      }, duration)
    );
  });

  function cleanup() {
    if (cleaned) return;
    cleaned = true;
    animations.forEach(a => a.cancel());
    nodes.forEach(n => n.remove());
  }

  function stop() {
    if (stopped) return;

    if (!isPreview && performance.now() - startTime < MIN_PAYMENT_LIFETIME) {
      return;
    }

    stopped = true;
    timeouts.forEach(clearTimeout);
    cleanup();
  }

  return { stop, finished };
}
