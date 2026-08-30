const ANIM_DEBUG =
  typeof window !== "undefined" &&
  process.env.NEXT_PUBLIC_ANIMATION_DEBUG === "true";

export function animLog(...args: unknown[]) {
  if (ANIM_DEBUG) console.log(...args);
}

export function animWarn(...args: unknown[]) {
  if (ANIM_DEBUG) console.warn(...args);
}
