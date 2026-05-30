import { AnimationHandle } from "@/types/animation.types";
import { AnimationMode } from "@/lib/animationMode";

export function popAndShootStyle({
  icons,
  count = 5,
  stagger = 0.15,
  rewardParticles = true,
  mode,
}: {
  icons: string[];
  count?: number;
  stagger?: number;
  rewardParticles?: boolean;
  mode: AnimationMode;
}): AnimationHandle {
  if (!icons.length) {
    return { stop: () => {}, finished: Promise.resolve() };
  }

  const isPreview = mode === "preview";
  const TOTAL_DURATION = isPreview ? 3600 : 9000;
  const cannonCount = isPreview ? 2 : 4;

  const startTime = performance.now();
  const MIN_PAYMENT_LIFETIME = TOTAL_DURATION * 0.85;

  /* ───────── Orientation-safe viewport access ───────── */
  const getOriginX = () => window.innerWidth / 2;
  const getOriginY = () => window.innerHeight - 40;
  const getTopY = () => 200;

  /* ───────── Overlay ───────── */
  const overlay = document.createElement("div");
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    pointerEvents: "none",
    zIndex: "2147483647",
  });
  document.body.appendChild(overlay);

  let stopped = false;
  let resolved = false;
  const timeouts: number[] = [];

  const finished = new Promise<void>(resolve => {
    const safeResolve = () => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    };

    const cannonSpacing = TOTAL_DURATION / cannonCount;

    for (let c = 0; c < cannonCount; c++) {
      const cannonStart = c * cannonSpacing;

      timeouts.push(
        window.setTimeout(() => {
          if (stopped) return;

          const originX = getOriginX();
          const originY = getOriginY();
          const topY = getTopY();

          const progress =
            Number(cannonCount) === 1 ? 1 : c / (cannonCount - 1);
          const sizeBase = isPreview ? 90 : 120;
          const size = sizeBase * (1 + progress * 0.25);
          const spread = isPreview ? 50 : 70;

          for (let i = 0; i < count; i++) {
            const delay = i * stagger * 1000;

            timeouts.push(
              window.setTimeout(() => {
                if (stopped) return;

                const img = document.createElement("img");
                img.src = icons[i % icons.length];

                const offset = (i - (count - 1) / 2) * spread;

                Object.assign(img.style, {
                  position: "fixed",
                  left: `${originX + offset - size / 2}px`,
                  top: `${originY - size}px`,
                  width: `${size}px`,
                  height: `${size}px`,
                  pointerEvents: "none",
                  willChange: "transform, opacity",
                });

                overlay.appendChild(img);

                const riseTime = isPreview ? 600 : 800;
                const holdTime = TOTAL_DURATION - riseTime - 800;
                const dy = topY - originY;
                const tRise = riseTime / TOTAL_DURATION;
                const tHoldEnd = (riseTime + holdTime) / TOTAL_DURATION;

                const keyframes: Keyframe[] = isPreview
                  ? [
                      { transform: "translateY(0) scale(0.85)", opacity: 0 },
                      {
                        transform: `translateY(${dy}px) scale(1)`,
                        opacity: 1,
                        offset: tRise,
                      },
                      {
                        transform: `translateY(${dy}px) scale(1.05)`,
                        opacity: 1,
                        offset: tHoldEnd,
                      },
                      {
                        transform: `translateY(${dy}px) scale(1)`,
                        opacity: 0,
                      },
                    ]
                  : [
                      {
                        transform: `translateY(0px) translateX(0px) scale(0.85)`,
                        opacity: 0,
                      },
                      {
                        transform: `translateY(${dy}px) translateX(0px) scale(1)`,
                        opacity: 1,
                        offset: tRise,
                      },
                      {
                        transform: `translateY(${dy}px) translateX(8px) scale(1.04)`,
                        opacity: 1,
                        offset: tRise + (tHoldEnd - tRise) * 0.33,
                      },
                      {
                        transform: `translateY(${dy}px) translateX(-8px) scale(1.06)`,
                        opacity: 1,
                        offset: tRise + (tHoldEnd - tRise) * 0.66,
                      },
                      {
                        transform: `translateY(${dy}px) translateX(0px) scale(1.05)`,
                        opacity: 1,
                        offset: tHoldEnd,
                      },
                      {
                        transform: `translateY(${dy}px) translateX(0px) scale(1)`,
                        opacity: 0,
                      },
                    ];

                img.animate(keyframes, {
                  duration: TOTAL_DURATION,
                  easing: "cubic-bezier(0.16,1,0.3,1)",
                  fill: "forwards",
                });

                timeouts.push(
                  window.setTimeout(() => img.remove(), TOTAL_DURATION + 150)
                );

                if (
                  mode === "payment" &&
                  rewardParticles &&
                  c >= cannonCount - 1
                ) {
                  spawnSparkles(originX + offset, topY);
                }
              }, delay)
            );
          }
        }, cannonStart)
      );
    }

    timeouts.push(
      window.setTimeout(() => {
        cleanup();
        safeResolve();
      }, TOTAL_DURATION + 300)
    );
  });

  function spawnSparkles(x: number, y: number) {
    if (stopped) return;

    for (let i = 0; i < 3; i++) {
      const spark = document.createElement("div");
      Object.assign(spark.style, {
        position: "fixed",
        left: `${x}px`,
        top: `${y}px`,
        width: "6px",
        height: "6px",
        borderRadius: "50%",
        background: "rgba(255,255,255,0.85)",
        pointerEvents: "none",
      });

      overlay.appendChild(spark);

      spark.animate(
        [
          { transform: "translateY(0) scale(0.6)", opacity: 0.8 },
          {
            transform: `translateY(-${60 + i * 20}px) scale(1)`,
            opacity: 0,
          },
        ],
        {
          duration: 1100,
          easing: "cubic-bezier(0.33,0,0.15,1)",
          fill: "forwards",
        }
      );

      timeouts.push(window.setTimeout(() => spark.remove(), 1200));
    }
  }

  function cleanup() {
    timeouts.forEach(clearTimeout);
    overlay.remove();
  }

  return {
    stop() {
      if (stopped) return;

      if (
        mode === "payment" &&
        performance.now() - startTime < MIN_PAYMENT_LIFETIME
      ) {
        return;
      }

      stopped = true;
      if (isPreview) cleanup();
    },
    finished,
  };
}
