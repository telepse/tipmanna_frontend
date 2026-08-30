import { AnimationMode } from "@/lib/animationMode";
import { AnimationHandle } from "@/types/animation.types";

interface SpiralFloatOptions {
  icons: string[];

  // lifecycle
  mode: AnimationMode;

  // layout
  laneTop?: number;
  laneHeight?: number;
  duration: number;

  // motion
  spiralRadius?: number;
  rotations?: number;
  spacing?: number;

  // scale
  scale?: number;
}

export function floatStyle({
  icons,
  duration = 20000,
  laneTop = 35,
  laneHeight = 25,
  spiralRadius = 40,
  rotations = 2.5,
  scale = 1,
  spacing = 16,
  mode: _mode,
}: SpiralFloatOptions): AnimationHandle {
  void _mode;

  if (!icons?.length) {
    return { stop: () => {}, finished: Promise.resolve() };
  }

  const overlay = document.createElement("div");

  Object.assign(overlay.style, {
    position: "fixed",
    left: "0",
    right: "0",
    top: `${laneTop}%`,
    height: `${laneHeight}%`,
    pointerEvents: "none",
    overflow: "visible",
    zIndex: "2147483647",
  });

  document.body.appendChild(overlay);

  // :white_check_mark: RESTORED: always 5 (original visual density)
  const ICON_COUNT = 5;

  const iconsEls: HTMLImageElement[] = [];
  let startTime = 0;

  let stopped = false;
  let rafId = 0;
  let firstFrame = false;

  for (let i = 0; i < ICON_COUNT; i++) {
    const img = document.createElement("img");
    img.src = icons[i % icons.length];

    Object.assign(img.style, {
      position: "absolute",
      width: "96px",
      height: "96px",
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)",
      pointerEvents: "none",
      willChange: "transform, opacity",
    });

    overlay.appendChild(img);
    iconsEls.push(img);
  }

  function animate(now: number) {
    if (stopped) return;

    if (!firstFrame) {
      firstFrame = true;
    }

    // const elapsed = now - startTime;
    if (startTime === 0) {
      startTime = now;
    }

    const elapsed = now - startTime;

    // :white_check_mark: RESTORED: 85% motion timing
    const motionProgress = Math.min(elapsed / duration, 1);
    const travelProgress = Math.min(elapsed / (duration * 0.85), 1);
    const pathEase = travelProgress * travelProgress * (3 - 2 * travelProgress);

    const thetaBase = motionProgress * Math.PI * 2 * rotations;

    let fadeOpacity = 1;

    // gentle fade in
    if (motionProgress < 0.03) {
      fadeOpacity = motionProgress / 0.03;
    }

    // fade ONLY at very end (last 5%)
    else if (motionProgress > 0.97) {
      fadeOpacity = (1 - motionProgress) / 0.05;
    }

    iconsEls.forEach((img, i) => {
      const phase = (i * 2 * Math.PI) / ICON_COUNT;
      const theta = thetaBase + phase;

      const radius = spiralRadius * (1 - motionProgress * 0.1);

      // :white_check_mark: RESTORED: RIGHT → LEFT motion (horizontal eased)
      // const x = 120 + (-20 - 120) * pathEase + i * spacing;
      const START_X = 160; // off-screen right
      const END_X = -60; // fully off-screen left

      const spreadOffset = (i - (ICON_COUNT - 1) / 2) * spacing;
      const x = START_X + (END_X - START_X) * pathEase + spreadOffset;

      const y = Math.sin(theta) * radius + laneHeight * 0.5;

      // keep within visible band (prevents accidental clipping illusion)
      const clampedY = Math.max(0, Math.min(100, y));

      img.style.opacity = `${fadeOpacity}`;
      img.style.transform = `
        translate(${x}vw, ${clampedY}%)
        scale(${scale})
      `;
    });

    if (elapsed < duration) {
      rafId = requestAnimationFrame(animate);
    } else {
      cleanup();
    }
  }

  rafId = requestAnimationFrame(animate);

  function cleanup() {
    cancelAnimationFrame(rafId);
    iconsEls.forEach(el => el.remove());
    overlay.remove();
  }

  function stop() {
    if (stopped) return;
    stopped = true;
    cleanup();
  }

  const finished = new Promise<void>(resolve => {
    const check = () => {
      if (!firstFrame) {
        requestAnimationFrame(check);
      } else if (
        stopped ||
        (startTime !== 0 && performance.now() - startTime >= duration)
      ) {
        resolve();
      } else {
        requestAnimationFrame(check);
      }
    };
    check();
  });

  return { stop, finished };
}
