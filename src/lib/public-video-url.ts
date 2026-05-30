/**
 * Share URL rules:
 * - Video in event context with known channelId → buildChannelShareUrl
 * - Content-only landing pages → buildContentShareUrl
 * - Event room links → buildRoomShareUrl
 */
import { getPublicAbsoluteUrl } from "@/lib/site-config";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isLikelyUuid(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  return UUID_RE.test(value.trim());
}

/** Safe event id for `/room/{id}` redirects (localStorage, payment fallback). */
export function sanitizeEventIdForRoomRedirect(
  value: string | null | undefined
): string | null {
  const trimmed = value?.trim();
  if (!trimmed || !isLikelyUuid(trimmed)) return null;
  return trimmed;
}

type SharePathArgs = {
  eventId: string;
  channelId?: string | null;
};

function appendChannelQuery(path: string, channelId?: string | null): string {
  const cid = channelId?.trim();
  if (!cid) return path;
  return `${path}?channel=${encodeURIComponent(cid)}`;
}

/** Path segment is always the parent event UUID; `?channel=` selects a video. */
export function buildChannelSharePath({
  eventId,
  channelId,
}: SharePathArgs): string {
  return appendChannelQuery(
    `/channel/${encodeURIComponent(eventId.trim())}`,
    channelId
  );
}

export function buildContentSharePath({
  eventId,
  channelId,
}: SharePathArgs): string {
  return appendChannelQuery(
    `/content/${encodeURIComponent(eventId.trim())}`,
    channelId
  );
}

export function buildRoomSharePath(eventId: string): string {
  return `/room/${encodeURIComponent(eventId.trim())}`;
}

export function buildChannelShareUrl(args: SharePathArgs): string {
  return getPublicAbsoluteUrl(buildChannelSharePath(args));
}

export function buildContentShareUrl(args: SharePathArgs): string {
  return getPublicAbsoluteUrl(buildContentSharePath(args));
}

export function buildRoomShareUrl(eventId: string): string {
  return getPublicAbsoluteUrl(buildRoomSharePath(eventId));
}

/** Pick playlist row for `?channel=` deep links. */
export function pickInitialChannelContent<T extends { id?: unknown }>(
  playlist: T[],
  initialChannelId?: string | null,
  fallback?: T
): T | undefined {
  if (!playlist.length) return fallback;
  const cid = initialChannelId?.trim();
  if (cid) {
    const match = playlist.find(row => String(row.id) === cid);
    if (match) return match;
  }
  return fallback ?? playlist[0];
}

export function parseChannelSearchParam(
  searchParams: Record<string, string | string[] | undefined>
): string | null {
  const raw = searchParams.channel ?? searchParams.channelId ?? searchParams.c;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (Array.isArray(raw) && raw[0]?.trim()) return raw[0].trim();
  return null;
}
