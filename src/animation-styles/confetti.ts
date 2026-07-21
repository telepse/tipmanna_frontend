import confetti from "canvas-confetti";
import { ANIMATION_DURATION } from "@/lib/animationContract";
import { AnimationMode } from "@/lib/animationMode";
import { AnimationHandle } from "@/types/animation.types";
import {
  traceAnimationAssetLoad,
  traceAnimationDomCleanup,
  traceAnimationDomMountAttempt,
  traceAnimationDomMounted,
  traceAnimationDomNotMounted,
} from "@/lib/animation-dom-trace";

export function confettiStyle({
  mode,
  tips,
}: {
  mode: AnimationMode;
  tips?: string[];
}): AnimationHandle {
  const isPaymentMode = mode === "payment";

  // :white_check_mark: RESTORED: colon-based emoji mapping (consistent rendering)
  const map: Record<string, string> = {
    Rose: "🌹",
    Star: "⭐",
    Love: "❤️",
    default: "🎉",
  };

  const emojis = tips?.length
    ? tips.map(t => map[t] || map.default)
    : ["🎉", "💸", "🌹", "⭐"];

  const shapes = emojis.map(e =>
    confetti.shapeFromText({
      text: e,
      scalar: isPaymentMode ? 10 : 8,
    })
  );

  const canvas = document.createElement("canvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const domCtx = { styleName: "Confetti", characterName: tips?.[0], mode };

  traceAnimationDomMountAttempt(domCtx, { mode });

  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    pointerEvents: "none",
    zIndex: "2147483630",
  });

  document.body.appendChild(canvas);

  if (!canvas.isConnected) {
    traceAnimationDomNotMounted(domCtx, "canvas_not_connected");
  } else {
    traceAnimationDomMounted(canvas, domCtx, { mode });
    traceAnimationAssetLoad(true, domCtx, { mode });
  }

  const fire = confetti.create(canvas, { resize: false, useWorker: true });
  const origin = { x: 0.5, y: 0.06 };

  const duration = isPaymentMode
    ? ANIMATION_DURATION.payment.default
    : ANIMATION_DURATION.preview.default;

  let stopped = false;
  const scheduledTimeouts: number[] = [];

  function cleanup() {
    if (stopped) return;
    stopped = true;
    traceAnimationDomCleanup(
      canvas,
      domCtx,
      "canvas[style*='fixed']",
      "started"
    );
    fire.reset();
    canvas.remove();
    traceAnimationDomCleanup(
      canvas,
      domCtx,
      "canvas[style*='fixed']",
      "completed"
    );
  }

  // ------------------ Initial Pulse ------------------
  function pulseBurst(multiplier = 1) {
    fire({
      particleCount: Math.floor((isPaymentMode ? 90 : 60) * multiplier),
      startVelocity: 36 * multiplier,
      spread: 300,
      gravity: 0.9,
      ticks: 260,
      origin,
      shapes,
      scalar: isPaymentMode ? 10 : 8,
    });
  }

  pulseBurst(1);
  scheduledTimeouts.push(
    window.setTimeout(() => pulseBurst(0.85), 140),
    window.setTimeout(() => pulseBurst(0.7), 300)
  );

  // ------------------ Side-finale burst (~80%) — payment only, capped particles ------------------
  const FINALE_PARTICLES_PER_SIDE = 34;
  if (isPaymentMode) {
    const finaleAt = Math.min(duration - 1, Math.floor(duration * 0.8 + 120));
    scheduledTimeouts.push(
      window.setTimeout(() => {
        if (stopped) return;
        fire({
          particleCount: FINALE_PARTICLES_PER_SIDE,
          startVelocity: 50,
          spread: 78,
          gravity: 1.02,
          ticks: 240,
          origin: { x: 0.11, y: 0.8 },
          shapes,
          scalar: 9,
        });
        fire({
          particleCount: FINALE_PARTICLES_PER_SIDE,
          startVelocity: 50,
          spread: 78,
          gravity: 1.02,
          ticks: 240,
          origin: { x: 0.89, y: 0.8 },
          shapes,
          scalar: 9,
        });
      }, finaleAt)
    );
  }

  // ------------------ Sustained Flow ------------------
  const intervalMs = isPaymentMode ? 600 : 650;
  const totalBursts = Math.ceil(duration / intervalMs);
  let burstCount = 0;

  const flowInterval = setInterval(() => {
    if (stopped || burstCount >= totalBursts) return;

    fire({
      particleCount: isPaymentMode ? 28 : 18,
      startVelocity: 18,
      spread: 260,
      gravity: 0.95,
      ticks: 220,
      origin,
      shapes,
      scalar: isPaymentMode ? 9 : 7,
    });

    burstCount++;
    if (burstCount >= totalBursts) clearInterval(flowInterval);
  }, intervalMs);

  // ------------------ Glitter ------------------
  const glitterInterval = isPaymentMode
    ? setInterval(() => {
        if (stopped) return;

        fire({
          particleCount: 10,
          startVelocity: 32,
          spread: 200,
          gravity: 0.7,
          ticks: 160,
          origin,
          shapes,
          scalar: 7.2,
        });

        scheduledTimeouts.push(
          window.setTimeout(() => {
            if (stopped) return;

            fire({
              particleCount: 10,
              startVelocity: 44,
              spread: 220,
              gravity: 0.6,
              ticks: 120,
              origin,
              shapes,
              scalar: 6.2,
            });
          }, 60)
        );
      }, 850)
    : null;

  // :white_check_mark: RESTORED: cleanup AFTER intervals cleared (natural finish)
  const finished = new Promise<void>(resolve => {
    setTimeout(() => {
      clearInterval(flowInterval);
      if (glitterInterval) clearInterval(glitterInterval);
      scheduledTimeouts.forEach(clearTimeout);
      scheduledTimeouts.length = 0;
      cleanup();
      resolve();
    }, duration);
  });

  return {
    stop() {
      clearInterval(flowInterval);
      if (glitterInterval) clearInterval(glitterInterval);
      scheduledTimeouts.forEach(clearTimeout);
      scheduledTimeouts.length = 0;
      cleanup();
    },
    finished,
  };
}
