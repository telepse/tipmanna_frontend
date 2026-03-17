import confetti from "canvas-confetti";

export const splashCharacter = (options?: {
  element?: HTMLElement | null;
  origin?: { x: number; y: number };
  tips?: string[]; // labels of purchased characters, e.g. ["Rose", "Love"]
}) => {
  // Map tip labels to actual emojis / characters
  const tipToEmojiMap: Record<string, string> = {
    Rose: "🌹",
    "Comedy Mask": "🎭",
    Star: "⭐",
    Love: "❤️",
    "Add text": "💬",
    default: "🎉",
  };

  // Convert tip labels to emojis; fallback to default if unknown
  const emojis = options?.tips?.length
    ? options.tips.map(tip => tipToEmojiMap[tip] || tipToEmojiMap.default)
    : ["🎉", "💸", "🌹", "⭐", "❤️"];

  // Convert each emoji to a canvas-confetti shape
  const shapes = emojis.map(emoji =>
    confetti.shapeFromText({ text: emoji, scalar: 5 })
  );

  // Create a temporary full-screen canvas
  const canvas = document.createElement("canvas");
  canvas.className =
    "fixed top-0 left-0 w-full h-full pointer-events-none z-[9999]";
  document.body.appendChild(canvas);

  const confettiInstance = confetti.create(canvas, {
    resize: true,
    useWorker: true,
  });

  // Compute origin (funnel element if provided)
  let originX = 0.8;
  let originY = 0.9;

  if (options?.element) {
    const rect = options.element.getBoundingClientRect();
    originX = (rect.left + rect.width / 2) / window.innerWidth;
    originY = (rect.top + rect.height / 2) / window.innerHeight;
  } else if (options?.origin) {
    originX = options.origin.x;
    originY = options.origin.y;
  }

  // Launch the confetti burst
  confettiInstance({
    particleCount: 100,
    angle: 135,
    spread: 60,
    startVelocity: 22,
    origin: { x: originX, y: originY },
    shapes,
    scalar: 5,
  });

  console.log("is it working?");

  // Clean up after animation
  setTimeout(() => {
    canvas.remove();
  }, 5000);
};
