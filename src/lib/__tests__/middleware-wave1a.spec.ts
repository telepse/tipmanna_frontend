import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { middleware } from "@/middleware";

function req(
  path: string,
  host: string,
  init?: { forwardedHost?: string; forwardedProto?: string }
): NextRequest {
  const url = new URL(path, `https://${host}`);
  const headers = new Headers({ host });
  if (init?.forwardedHost) headers.set("x-forwarded-host", init.forwardedHost);
  if (init?.forwardedProto)
    headers.set("x-forwarded-proto", init.forwardedProto);
  return new NextRequest(url, { headers });
}

describe("middleware Wave 1A (post config-redirect move)", () => {
  const prevMode = process.env.NEXT_PUBLIC_LEGACY_REDIRECT_MODE;
  const prevPrimary = process.env.NEXT_PUBLIC_PRIMARY_ORIGIN;

  afterEach(() => {
    if (prevMode === undefined) delete process.env.NEXT_PUBLIC_LEGACY_REDIRECT_MODE;
    else process.env.NEXT_PUBLIC_LEGACY_REDIRECT_MODE = prevMode;
    if (prevPrimary === undefined) delete process.env.NEXT_PUBLIC_PRIMARY_ORIGIN;
    else process.env.NEXT_PUBLIC_PRIMARY_ORIGIN = prevPrimary;
  });

  it("does not redirect `/` (handled by next.config)", async () => {
    const res = middleware(req("/", "tipmanna.tv"));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-middleware-rewrite") || res.headers.get("location")).toBeFalsy();
  });

  it("does not redirect tipmanna.live (handled by next.config)", () => {
    const res = middleware(req("/room/abc?x=1", "tipmanna.live"));
    // Without config layer in unit test, middleware must not invent .live redirect
    expect(res.headers.get("location")).toBeNull();
    expect(res.status).toBe(200);
  });

  it("rewrites /@handle to /creator/handle", () => {
    const res = middleware(req("/@alice", "tipmanna.tv"));
    const rewrite = res.headers.get("x-middleware-rewrite");
    expect(rewrite).toBeTruthy();
    expect(rewrite).toContain("/creator/alice");
  });

  it("preserves query on /@handle rewrite", () => {
    const res = middleware(req("/@alice?tab=channels", "tipmanna.tv"));
    const rewrite = res.headers.get("x-middleware-rewrite");
    expect(rewrite).toContain("/creator/alice?tab=channels");
  });

  it("path-preserving .com discover redirect remains 301", () => {
    process.env.NEXT_PUBLIC_LEGACY_REDIRECT_MODE = "path-preserving";
    process.env.NEXT_PUBLIC_PRIMARY_ORIGIN = "https://tipmanna.tv";
    const res = middleware(req("/discover/top?q=1", "tipmanna.com"));
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe(
      "https://tipmanna.tv/discover/top?q=1"
    );
  });

  it(".com non-preserved paths funnel to /partner", () => {
    process.env.NEXT_PUBLIC_LEGACY_REDIRECT_MODE = "path-preserving";
    process.env.NEXT_PUBLIC_PRIMARY_ORIGIN = "https://tipmanna.tv";
    const res = middleware(req("/about", "tipmanna.com"));
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("https://tipmanna.tv/partner");
  });

  it("host casing normalize still redirects with 308", () => {
    const res = middleware(req("/explore", "Tipmanna.TV"));
    expect(res.status).toBe(308);
    const loc = res.headers.get("location");
    expect(loc).toBeTruthy();
    expect(new URL(loc!).hostname).toBe("tipmanna.tv");
  });

  it("passes through ordinary page requests", () => {
    const res = middleware(req("/explore", "tipmanna.tv"));
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("passes through robots and sitemap paths (matcher may still invoke)", () => {
    const robots = middleware(req("/robots.txt", "tipmanna.tv"));
    const sitemap = middleware(req("/sitemap.xml", "tipmanna.tv"));
    expect(robots.status).toBe(200);
    expect(sitemap.status).toBe(200);
  });
});
