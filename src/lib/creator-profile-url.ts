import { getPublicAbsoluteUrl } from "@/lib/site-config";

export function normalizeCreatorUsername(username: string): string {
  return username.trim().replace(/^@/, "");
}

/** Public creator page path (e.g. `/@handle`). */
export function buildCreatorProfileSharePath(username: string): string {
  const handle = normalizeCreatorUsername(username);
  if (!handle) return "/";
  return `/@${encodeURIComponent(handle)}`;
}

/** Absolute share URL for a creator profile (production origin). */
export function buildCreatorProfileShareUrl(username: string): string {
  return getPublicAbsoluteUrl(buildCreatorProfileSharePath(username));
}
