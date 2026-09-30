import type { OverlayContentSeed } from "@/lib/content-playback-overlay-seed";

const STORAGE_KEY = "tipmanna:overlay-play-seed";
const SEED_TTL_MS = 60_000;

type StoredSeed = OverlayContentSeed & { writtenAt: number };

function readRaw(): StoredSeed | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSeed;
    if (
      !parsed ||
      typeof parsed.eventId !== "string" ||
      typeof parsed.channelId !== "string" ||
      typeof parsed.writtenAt !== "number"
    ) {
      return null;
    }
    if (Date.now() - parsed.writtenAt > SEED_TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Write before window.open so the new tab can Phase-A mount with url.
 * Uses localStorage (short TTL) so handoff works with noopener tabs.
 */
export function writeOverlayPlaySeed(seed: OverlayContentSeed): void {
  if (typeof window === "undefined") return;
  const eventId = seed.eventId?.trim() ?? "";
  const channelId = seed.channelId?.trim() ?? "";
  const url = seed.url?.trim() ?? "";
  if (!eventId || !channelId || !url) return;
  const payload: StoredSeed = {
    eventId,
    channelId,
    url,
    title: seed.title?.trim() || undefined,
    writtenAt: Date.now(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode — fall back to channel fetch */
  }
}

/**
 * Consume a matching seed for this event/channel (clears storage).
 * Returns null on mismatch, expiry, or missing url.
 */
export function takeOverlayPlaySeed(
  eventId: string,
  channelId: string
): OverlayContentSeed | null {
  const stored = readRaw();
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  if (!stored) return null;
  const wantEvent = eventId.trim();
  const wantChannel = channelId.trim();
  if (stored.eventId !== wantEvent || stored.channelId !== wantChannel) {
    return null;
  }
  const url = stored.url?.trim() ?? "";
  if (!url) return null;
  return {
    eventId: stored.eventId,
    channelId: stored.channelId,
    url,
    title: stored.title,
  };
}
