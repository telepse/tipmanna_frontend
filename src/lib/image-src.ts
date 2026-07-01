/**
 * Hosts that are allowlisted for next/image's optimizing loader in
 * `next.config.ts` (`images.remotePatterns`). Keep this list in sync with that
 * config.
 */
const OPTIMIZABLE_IMAGE_HOSTS = new Set<string>([
  "res.cloudinary.com",
  "api.dicebear.com",
  "calendar.google.com",
  "img.youtube.com",
  "flagcdn.com",
  "i.ytimg.com",
]);

/**
 * Returns `true` when `src` can be safely handed to next/image's optimizing
 * loader. Local/relative and data URLs are always fine; remote URLs are only
 * optimizable when their host is allowlisted in `next.config.ts`.
 *
 * Content-supplied image URLs (program/community/stream artwork) can point at
 * arbitrary hosts. next/image's default loader throws synchronously for any
 * unconfigured host, and that throw bubbles to the nearest error boundary and
 * crashes the whole surface. Rendering such URLs with `unoptimized` avoids the
 * throw while still displaying (or gracefully failing) the individual image.
 */
export function isOptimizableImageSrc(src?: string | null): boolean {
  if (!src) return false;
  if (src.startsWith("/") || src.startsWith("data:")) return true;
  try {
    const url = new URL(src);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    return OPTIMIZABLE_IMAGE_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}
