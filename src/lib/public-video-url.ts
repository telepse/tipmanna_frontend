/**
 * Share URL rules:
 * - Per-video share/copy → buildContentShareUrl (`/content/{eventId}?v={videoId}`)
 * - Event channel playlist (enlarge lightbox only) → buildChannelShareUrl
 * - Event room links → buildRoomShareUrl
 */
import { getPublicAbsoluteUrl } from "@/lib/site-config";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Query param that selects a video on /content or /channel pages. */
export const VIDEO_DEEP_LINK_PARAM = "v";

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

function appendVideoDeepLinkQuery(
  path: string,
  channelId?: string | null
): string {
  const cid = channelId?.trim();
  if (!cid) return path;
  return `${path}?${VIDEO_DEEP_LINK_PARAM}=${encodeURIComponent(cid)}`;
}

/** Path segment is always the parent event UUID; `?v=` selects a video. */
export function buildChannelSharePath({
  eventId,
  channelId,
}: SharePathArgs): string {
  return appendVideoDeepLinkQuery(
    `/channel/${encodeURIComponent(eventId.trim())}`,
    channelId
  );
}

export function buildContentSharePath({
  eventId,
  channelId,
}: SharePathArgs): string {
  return appendVideoDeepLinkQuery(
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

/** Apply video deep-link query param to URLSearchParams for canonical redirects. */
export function applyVideoDeepLinkQuery(
  params: URLSearchParams,
  videoId: string | null | undefined
): void {
  const id = videoId?.trim();
  if (!id) return;
  params.set(VIDEO_DEEP_LINK_PARAM, id);
}

/** Pick playlist row for `?v=` deep links; prefers default when no deep link. */
export function pickInitialChannelContent<
  T extends { id?: unknown; isDefault?: boolean },
>(
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
  if (fallback) return fallback;
  return (
    playlist.find(row => row.isDefault === true) ??
    playlist[0]
  );
}

export function parseChannelSearchParam(
  searchParams: Record<string, string | string[] | undefined>
): string | null {
  const raw =
    searchParams[VIDEO_DEEP_LINK_PARAM] ??
    searchParams.channel ??
    searchParams.channelId ??
    searchParams.c;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (Array.isArray(raw) && raw[0]?.trim()) return raw[0].trim();
  return null;
}
