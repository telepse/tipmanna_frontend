import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { resolveCreatorAtRewriteUrl } from "@/lib/creator-at-rewrite";
import {
  getLegacyRedirectMode,
  isDiscoveryHost,
  resolveLegacyRedirectTarget,
} from "@/lib/site-config";

function normalizeHostname(host: string | null): string {
  return (host ?? "").split(":")[0].toLowerCase();
}

export function middleware(request: NextRequest) {
  const rawHost = request.headers.get("host");
  const hostname = normalizeHostname(rawHost);
  const { pathname, search } = request.nextUrl;

  // Host casing / port normalize — clone only when redirecting.
  if (rawHost && hostname !== rawHost.split(":")[0]) {
    const dest = request.nextUrl.clone();
    const port = rawHost.includes(":") ? rawHost.split(":")[1] : "";
    dest.hostname = port ? `${hostname}:${port}` : hostname;
    dest.protocol = request.nextUrl.protocol;
    return NextResponse.redirect(dest, 308);
  }

  // Legacy discovery host (.com) is a configurable redirect-only layer.
  // Root and marketing routes funnel to /partner; known content/entity paths
  // are path-preserving so accumulated SEO/backlink equity is retained.
  // (.live → .tv and `/` → `/explore` live in next.config redirects — before Middleware.)
  if (isDiscoveryHost(hostname) && getLegacyRedirectMode() !== "off") {
    const target = resolveLegacyRedirectTarget(pathname, search);
    if (target) {
      return NextResponse.redirect(target, 301);
    }
  }

  const creatorRewrite = resolveCreatorAtRewriteUrl({
    pathname,
    search,
    origin: request.nextUrl.origin,
    forwardedHost: request.headers.get("x-forwarded-host"),
    forwardedProto: request.headers.get("x-forwarded-proto"),
  });
  if (creatorRewrite) {
    return NextResponse.rewrite(creatorRewrite);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/).*)",
  ],
};
