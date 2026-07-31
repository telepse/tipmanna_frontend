import { AnimationHandle } from "@/types/animation.types";
import { ANIMATION_DURATION } from "@/lib/animationContract";
import { AnimationMode } from "@/lib/animationMode";
import { tracePaymentAnimation } from "@/lib/payment-animation-trace";

/** Compiled-bundle marker for E6A Spin lifecycle verification (search: e6a-v3). */
export const SPIN_LIFECYCLE_VERSION = "e6a-v3";

type SpinFinishReason = "natural" | "stop" | "deferred_stop";

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
  let finalized = false;

  const rafs = new Set<number>();
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const nodes: HTMLElement[] = [];

  let resolveFinished!: () => void;
  const finished = new Promise<void>(resolve => {
    resolveFinished = resolve;
  });

  function traceSpin(
    stage:
      | "spin_factory_entered"
      | "spin_natural_timer_scheduled"
      | "spin_finish_entered"
      | "spin_finish_resolved",
    extra?: Record<string, unknown>
  ): void {
    tracePaymentAnimation({
      stage,
      spinLifecycleVersion: SPIN_LIFECYCLE_VERSION,
      mode,
      durationMs: TOTAL,
      styleName: "Spin",
      timestamp: Date.now(),
      environment: process.env.NODE_ENV ?? "unknown",
      ...extra,
    });
  }

  traceSpin("spin_factory_entered");

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

  const paymentEnergy = (t: number) => (t < 0.9 ? Math.pow(t / 0.9, 0.92) : 1);

  function finish(reason: SpinFinishReason): void {
    if (finalized) return;
    finalized = true;
    stopped = true;

    traceSpin("spin_finish_entered", { reason });

    timers.forEach(id => clearTimeout(id));
    timers.clear();
    rafs.forEach(cancelAnimationFrame);
    rafs.clear();

    nodes.forEach(n => {
      if (n.isConnected) n.remove();
    });
    nodes.length = 0;

    if (overlay.isConnected) overlay.remove();

    resolveFinished();
    traceSpin("spin_finish_resolved", { reason });
  }

  function scheduleTimer(fn: () => void, ms: number): void {
    const id = setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
  }

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

      const elapsed = now - startTime;
      const t = Math.min(elapsed / TOTAL, 1);
      const e = isPreview ? previewEnergy(t) : paymentEnergy(t);

      const rotations = isPreview ? Math.PI * 6 : Math.PI * 9;
      const angle = e * rotations + offset;

      const r = radius * (isPreview ? 0.5 + e * 0.5 : 0.45 + e * 0.75);

      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;

      const release =
        t < 0.88 ? 1 : Math.max(0, 1 - Math.pow((t - 0.88) / 0.12, 0.7));

      const staggerWindow = isPreview ? 0.16 : 0.2;
      const fadeInDur = isPreview ? 0.075 : 0.095;
      const startAt = (index / Math.max(count, 1)) * staggerWindow;
      const entrance =
        t <= startAt ? 0 : Math.min(1, (t - startAt) / fadeInDur);

      img.style.opacity = `${entrance * release}`;
      img.style.transform = `
        translate(${x}px, ${y}px)
        translate(-50%, -50%)
        scale(${release})
      `;

      if (!isPreview && t > 0.55) {
        const glowAlpha = Math.min(1, (t - 0.55) / 0.13) * 0.95;
        img.style.filter = `drop-shadow(0 0 26px rgba(255,215,0,${glowAlpha}))`;
      } else if (!isPreview) {
        img.style.filter = "";
      }

      if (t < 1) {
        const id = requestAnimationFrame(animate);
        rafs.add(id);
      }
    }

    const id = requestAnimationFrame(animate);
    rafs.add(id);
  }

  for (let i = 0; i < count; i++) spawn(i);

  /* ───────────── Natural completion (wall-clock, not RAF-dependent) ───────────── */

  scheduleTimer(() => finish("natural"), TOTAL);
  traceSpin("spin_natural_timer_scheduled", { delayMs: TOTAL });

  /* ───────────── Temporal Anchor ───────────── */

  scheduleTimer(() => {}, TOTAL * 0.6);

  /* ───────────── Stop ───────────── */

  function stop(): void {
    if (finalized) return;

    if (isPreview) {
      finish("stop");
      return;
    }

    const elapsed = performance.now() - startTime;
    if (elapsed < MIN_PAYMENT_LIFETIME) {
      scheduleTimer(
        () => finish("deferred_stop"),
        MIN_PAYMENT_LIFETIME - elapsed
      );
      return;
    }

    finish("stop");
  }

  return { stop, finished };
}
