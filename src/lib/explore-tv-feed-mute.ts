"use client";

/** In-memory TV feed mute — survives SPA navigation; full reload resets to muted. */
let tvFeedMuted = true;
const listeners = new Set<() => void>();

export function getExploreTvFeedMuted(): boolean {
  return tvFeedMuted;
}

export function setExploreTvFeedMuted(muted: boolean): void {
  if (tvFeedMuted === muted) return;
  tvFeedMuted = muted;
  for (const listener of listeners) {
    listener();
  }
}

export function toggleExploreTvFeedMuted(): boolean {
  setExploreTvFeedMuted(!tvFeedMuted);
  return tvFeedMuted;
}

export function subscribeExploreTvFeedMuted(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
