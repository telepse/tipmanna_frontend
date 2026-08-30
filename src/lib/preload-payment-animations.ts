import {
  isKnownAnimationStyleName,
  type StyleCharacterInput,
} from "@/lib/animation-style-registry";

/**
 * Must match `ANIMATION_STYLE_REGISTRY` Luxurious `videos` entry.
 * Preload only; does not run luxuriousStyle().
 */
const LUXURIOUS_PAYMENT_VIDEO_URL = "/icons/crown.webm";

const preloadedImageUrls = new Set<string>();
const preloadedVideoUrls = new Set<string>();

let confettiModulePrefetch: Promise<unknown> | null = null;

function preloadImageUrl(url: string): void {
  const trimmed = url.trim();
  if (!trimmed || preloadedImageUrls.has(trimmed)) return;
  preloadedImageUrls.add(trimmed);
  const img = new Image();
  img.src = trimmed;
}

/**
 * Warms HTTP cache for a video via a detached element (never appended, never played).
 */
function preloadVideoUrl(url: string): void {
  const trimmed = url.trim();
  if (!trimmed || preloadedVideoUrls.has(trimmed)) return;
  preloadedVideoUrls.add(trimmed);

  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  video.src = trimmed;

  const cleanup = () => {
    video.removeAttribute("src");
    video.load();
  };

  video.addEventListener("canplaythrough", cleanup, { once: true });
  video.addEventListener("error", cleanup, { once: true });
  window.setTimeout(cleanup, 5_000);
  video.load();
}

function prefetchConfettiModuleOnce(): void {
  if (typeof window === "undefined") return;
  if (!confettiModulePrefetch) {
    confettiModulePrefetch = import("canvas-confetti");
  }
}

/** Collect URLs to warm for one character’s payment path (no factories, no DOM mount). */
export function collectPaymentPreloadUrls(
  character: StyleCharacterInput
): string[] {
  if (!isKnownAnimationStyleName(character.styleName)) return [];

  const icon = character.iconUrl?.trim() ?? "";

  switch (character.styleName) {
    case "Confetti":
      return [];
    case "Luxurious":
      return [LUXURIOUS_PAYMENT_VIDEO_URL];
    case "Gold Rain":
    case "Luxury Fireworks":
    case "Dragon Spiral":
    case "Cosmic Vortex":
      return icon ? [icon] : [];
    default:
      return icon ? [icon] : [];
  }
}

/**
 * Safe preload for payment animations: images, optional video, optional confetti chunk.
 * Does not call createAnimationFromStyle or animation style factories.
 */
export function preloadPaymentAnimationAssetsForCharacters(
  characters: StyleCharacterInput[]
): void {
  if (typeof window === "undefined" || !characters.length) return;

  let needsConfetti = false;

  for (const character of characters) {
    try {
      if (
        isKnownAnimationStyleName(character.styleName) &&
        character.styleName === "Confetti"
      ) {
        needsConfetti = true;
      }

      const urls = collectPaymentPreloadUrls(character);
      for (const url of urls) {
        if (
          url.endsWith(".webm") ||
          url.endsWith(".mp4") ||
          url.endsWith(".mov")
        ) {
          preloadVideoUrl(url);
        } else {
          preloadImageUrl(url);
        }
      }
    } catch {
      /* ignore per-character failures */
    }
  }

  if (needsConfetti) {
    prefetchConfettiModuleOnce();
  }
}
