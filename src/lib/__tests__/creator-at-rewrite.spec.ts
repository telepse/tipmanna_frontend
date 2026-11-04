import { describe, expect, it } from "vitest";

import { resolveCreatorAtRewriteUrl } from "@/lib/creator-at-rewrite";

describe("resolveCreatorAtRewriteUrl", () => {
  it("rewrites /@handle to /creator/handle", () => {
    const dest = resolveCreatorAtRewriteUrl({
      pathname: "/@b1e2e_1c0d9c7c",
      search: "",
      origin: "http://127.0.0.1:3014",
      forwardedHost: null,
      forwardedProto: null,
    });
    expect(dest?.href).toBe("http://127.0.0.1:3014/creator/b1e2e_1c0d9c7c");
  });

  it("prefers x-forwarded host/proto over listen-host origin (LAN TLS proxy)", () => {
    const dest = resolveCreatorAtRewriteUrl({
      pathname: "/@b1e2e_cbdc5ed6",
      search: "",
      origin: "https://localhost:3014",
      forwardedHost: "192.168.1.202:3443",
      forwardedProto: "https",
    });
    expect(dest?.href).toBe(
      "https://192.168.1.202:3443/creator/b1e2e_cbdc5ed6"
    );
    expect(dest?.href).not.toMatch(/localhost:3014/);
  });

  it("preserves query string", () => {
    const dest = resolveCreatorAtRewriteUrl({
      pathname: "/@alice",
      search: "?tab=channels",
      origin: "http://127.0.0.1:3014",
      forwardedHost: null,
      forwardedProto: null,
    });
    expect(dest?.href).toBe(
      "http://127.0.0.1:3014/creator/alice?tab=channels"
    );
  });

  it("returns null for non-handle paths", () => {
    expect(
      resolveCreatorAtRewriteUrl({
        pathname: "/creator/alice",
        origin: "http://127.0.0.1:3014",
        forwardedHost: null,
        forwardedProto: null,
      })
    ).toBeNull();
  });
});
