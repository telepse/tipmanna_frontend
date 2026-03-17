import { AnimationHandle } from "@/types/animation.types";
import { ANIMATION_DURATION } from "@/lib/animationContract";
import { AnimationMode } from "@/lib/animationMode";

type SpinOptions = {
  icons: string[];
  count?: number;
  radius?: number;
  mode: AnimationMode;
};

const PAYMENT_MIN_RATIO = 0.9;

export function spinStyle({
  icons,
  count = 8,
  radius = 140,
  mode,
}: SpinOptions): AnimationHandle {
  if (!icons.length) {
    return { stop: () => {}, finished: Promise.resolve() };
  }

  const isPreview = mode === "preview";
  const TOTAL = isPreview
    ? ANIMATION_DURATION.preview.default
    : ANIMATION_DURATION.payment.default;

  const MIN_PAYMENT_LIFETIME = TOTAL * PAYMENT_MIN_RATIO;

  const startTime = performance.now();
  let stopped = false;
  let firstFrameCommitted = false;

  const rafs = new Set<number>();
  const anchors: number[] = [];
  const nodes: HTMLElement[] = [];

  /* ───────────── Overlay (Tier-Correct) ───────────── */

  const overlay = document.createElement("div");
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    pointerEvents: "none",
    zIndex: "2147483660",
  });
  document.body.appendChild(overlay);

  /* ───────────── Origin Lock ───────────── */

  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;

  /* ───────────── Energy Curves ───────────── */

  const previewEnergy = (t: number) =>
    t < 0.85 ? Math.pow(t / 0.85, 1.25) : 1;

  const paymentEnergy = (t: number) => (t < 0.9 ? t / 0.9 : 1);

  /* ───────────── Spawn ───────────── */

  function spawn(index: number) {
    const img = document.createElement("img");
    img.src = icons[index % icons.length];

    Object.assign(img.style, {
      position: "absolute",
      width: "96px",
      height: "96px",
      left: `${cx}px`,
      top: `${cy}px`,
      transform: "translate(-50%, -50%) scale(0.92)",
      opacity: "0",
      willChange: "transform, opacity, filter",
    });

    overlay.appendChild(img);
    nodes.push(img);

    const offset = (Math.PI * 2 * index) / count;

    function animate(now: number) {
      if (stopped) return;

      firstFrameCommitted = true;

      const elapsed = now - startTime;
      const t = Math.min(elapsed / TOTAL, 1);
      const e = isPreview ? previewEnergy(t) : paymentEnergy(t);

      const rotations = isPreview ? Math.PI * 6 : Math.PI * 9;
      const angle = e * rotations + offset;

      const r = radius * (isPreview ? 0.5 + e * 0.5 : 0.45 + e * 0.75);

      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;

      const release = t < 0.88 ? 1 : Math.max(0, 1 - (t - 0.88) / 0.12);

      img.style.opacity = "1";
      img.style.transform = `
        translate(${x}px, ${y}px)
        translate(-50%, -50%)
        scale(${release})
      `;

      if (!isPreview && t > 0.6) {
        img.style.filter = "drop-shadow(0 0 26px rgba(255,215,0,0.95))";
      }

      if (t < 1) {
        const id = requestAnimationFrame(animate);
        rafs.add(id);
      } else {
        img.remove();
      }
    }

    const id = requestAnimationFrame(animate);
    rafs.add(id);
  }

  for (let i = 0; i < count; i++) spawn(i);

  /* ───────────── Temporal Anchor ───────────── */

  anchors.push(window.setTimeout(() => {}, TOTAL * 0.6));

  /* ───────────── Finished Promise ───────────── */

  const finished = new Promise<void>(resolve => {
    const check = () => {
      if (firstFrameCommitted && performance.now() - startTime >= TOTAL) {
        resolve();
      } else {
        requestAnimationFrame(check);
      }
    };
    check();
  });

  /* ───────────── Stop ───────────── */

  function stop() {
    if (stopped) return;

    if (!isPreview) {
      if (!firstFrameCommitted) return;
      if (performance.now() - startTime < MIN_PAYMENT_LIFETIME) return;
    }

    stopped = true;
    rafs.forEach(cancelAnimationFrame);
    anchors.forEach(clearTimeout);
    nodes.forEach(n => n.remove());
    overlay.remove();
  }

  finished.then(stop);

  return { stop, finished };
}
