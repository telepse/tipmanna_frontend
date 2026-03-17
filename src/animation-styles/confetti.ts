import confetti from "canvas-confetti";

// Local impoorts
import { AnimationHandle } from "@/types/animation.types";
import { ANIMATION_DURATION } from "@/lib/animationContract";
import { AnimationMode } from "@/lib/animationMode";

export function confettiStyle({
  mode,
  tips,
}: {
  mode: AnimationMode;
  tips?: string[];
}): AnimationHandle {
  const map: Record<string, string> = {
    Rose: "🌹",
    Star: "⭐",
    Love: "❤️",
    default: "🎉",
  };

  const isPaymentMode = mode === "payment";

  const emojis = tips?.length
    ? tips.map(t => map[t] || map.default)
    : ["🎉", "💸", "🌹", "⭐"];
  const shapes = emojis.map(e =>
    confetti.shapeFromText({ text: e, scalar: isPaymentMode ? 10 : 8 })
  );

  const canvas = document.createElement("canvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    pointerEvents: "none",
    zIndex: "2147483630",
  });
  document.body.appendChild(canvas);

  const fire = confetti.create(canvas, { resize: false, useWorker: true });
  const origin = { x: 0.5, y: 0.06 };
  const duration = isPaymentMode
    ? ANIMATION_DURATION.payment.default
    : ANIMATION_DURATION.preview.default;

  let stopped = false;

  function cleanup() {
    if (stopped) return;
    stopped = true;
    fire.reset();
    canvas.remove();
  }

  // Pulse bursts
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
  setTimeout(() => pulseBurst(0.85), 180);
  setTimeout(() => pulseBurst(0.7), 360);

  // Sustained flow
  const intervalMs = 650;
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

  // Glitter for payment
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
        setTimeout(() => {
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
        }, 60);
      }, 850)
    : null;

  // Finished promise
  const finished = new Promise<void>(resolve => {
    setTimeout(() => {
      if (!stopped) cleanup();
      if (glitterInterval) clearInterval(glitterInterval);
      clearInterval(flowInterval);
      resolve();
    }, duration);
  });

  return {
    stop() {
      clearInterval(flowInterval);
      if (glitterInterval) clearInterval(glitterInterval);
      cleanup();
    },
    finished,
  };
}
