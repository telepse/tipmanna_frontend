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
  const url = request.nextUrl.clone();
  const rawHost = request.headers.get("host");
  const hostname = normalizeHostname(rawHost);

  if (rawHost && hostname !== rawHost.split(":")[0]) {
    const dest = url.clone();
    const port = rawHost.includes(":") ? rawHost.split(":")[1] : "";
    dest.hostname = port ? `${hostname}:${port}` : hostname;
    dest.protocol = url.protocol;
    return NextResponse.redirect(dest, 308);
  }

  // Legacy discovery host (.com) is a configurable redirect-only layer.
  // Root and marketing routes funnel to /partner; known content/entity paths
  // are path-preserving so accumulated SEO/backlink equity is retained.
  if (isDiscoveryHost(hostname) && getLegacyRedirectMode() !== "off") {
    const target = resolveLegacyRedirectTarget(url.pathname, url.search);
    if (target) {
      return NextResponse.redirect(target, 301);
    }
  }

  if (hostname === "tipmanna.live" || hostname === "www.tipmanna.live") {
    const dest = url.clone();
    dest.hostname =
      hostname === "www.tipmanna.live" ? "www.tipmanna.tv" : "tipmanna.tv";
    dest.protocol = "https:";
    return NextResponse.redirect(dest, 308);
  }

  if (url.pathname === "/") {
    url.pathname = "/explore";
    return NextResponse.redirect(url, 308);
  }

  const creatorRewrite = resolveCreatorAtRewriteUrl({
    pathname: url.pathname,
    search: url.search,
    origin: url.origin,
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
