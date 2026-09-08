import { describe, expect, it } from "vitest";

import { resolvePostHostAuthDestination } from "@/lib/post-host-auth-destination";

describe("resolvePostHostAuthDestination", () => {
  it("prefers returnTo over creator profile", () => {
    expect(
      resolvePostHostAuthDestination({
        hostUsername: "creator",
        eventSlug: "my-slug",
        returnTo: "/host/my-slug/revenue",
      })
    ).toBe("/host/my-slug/revenue");
  });

  it("lands on creator profile when username is present", () => {
    expect(
      resolvePostHostAuthDestination({
        hostUsername: "creator",
        eventSlug: "my-slug",
      })
    ).toBe("/@creator");
  });

  it("does not prefer dashboard when username exists", () => {
    const dest = resolvePostHostAuthDestination({
      hostUsername: "creator",
      eventSlug: "my-slug",
    });
    expect(dest).not.toBe("/host/my-slug");
  });

  it("falls back to explore without username or slug", () => {
    expect(resolvePostHostAuthDestination({})).toBe("/explore");
  });
});
