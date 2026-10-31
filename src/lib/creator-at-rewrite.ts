/**
 * Resolve `/@handle` → `/creator/handle` rewrite target for middleware.
 *
 * Behind a TLS-terminating reverse proxy, Next may see Host as the upstream
 * listen address (e.g. localhost:3014) while x-forwarded-proto is https.
 * Rewriting with that origin yields `https://localhost:3014/creator/...`,
 * which EPROTO/500s against an HTTP-only Next bind. Prefer x-forwarded-*.
 */
export function resolveCreatorAtRewriteUrl(input: {
  pathname: string;
  search?: string;
  origin: string;
  forwardedHost: string | null;
  forwardedProto: string | null;
}): URL | null {
  const match = input.pathname.match(/^\/@([^/]+)\/?$/);
  if (!match) return null;

  const handle = match[1];
  const search = input.search ?? "";
  const fwdProto = input.forwardedProto?.split(",")[0]?.trim() ?? "";
  const fwdHost = input.forwardedHost?.split(",")[0]?.trim() ?? "";

  const origin =
    fwdHost && (fwdProto === "http" || fwdProto === "https")
      ? `${fwdProto}://${fwdHost}`
      : input.origin;

  return new URL(`/creator/${handle}${search}`, origin);
}
