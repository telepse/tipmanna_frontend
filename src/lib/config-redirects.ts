/**
 * next.config redirects that run *before* Middleware (Next.js 15 execution order).
 * Wave 1A: move high-volume host/path redirects out of Edge middleware CPU.
 *
 * permanent: true → HTTP 308 (matches prior middleware behaviour).
 * Query strings are preserved by Next.js redirects by default.
 */

export type Wave1ConfigRedirect = {
  source: string;
  destination: string;
  permanent: true;
  has?: Array<{ type: "host"; value: string }>;
};

/**
 * Order matters: `.live` host redirects first (path-preserving), then `/` → `/explore`.
 * That preserves prior middleware sequencing for tipmanna.live/ → tipmanna.tv/ → /explore.
 */
export function getWave1ConfigRedirects(): Wave1ConfigRedirect[] {
  return [
    {
      source: "/:path*",
      has: [{ type: "host", value: "tipmanna.live" }],
      destination: "https://tipmanna.tv/:path*",
      permanent: true,
    },
    {
      source: "/:path*",
      has: [{ type: "host", value: "www.tipmanna.live" }],
      destination: "https://www.tipmanna.tv/:path*",
      permanent: true,
    },
    {
      source: "/",
      destination: "/explore",
      permanent: true,
    },
  ];
}
