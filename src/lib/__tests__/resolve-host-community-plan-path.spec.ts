import { describe, expect, it, vi } from "vitest";

import type { HostCapability } from "@/hooks/use-host-capability";
import {
  manageHostCommunityHref,
  resolveHostCommunityPlanPath,
  resolveHostCommunityPlanSlug,
} from "../resolve-host-community-plan-path";

vi.mock("@/lib/host-session-client", () => ({
  getHostUserFromCookies: vi.fn(() => null),
}));

import { getHostUserFromCookies } from "@/lib/host-session-client";

const loadingCapability: HostCapability = { status: "loading" };
const noneCapability: HostCapability = { status: "none" };

describe("resolveHostCommunityPlanSlug", () => {
  it("prefers explicit preferredHostSlug", () => {
    expect(
      resolveHostCommunityPlanSlug({
        preferredHostSlug: "my-event",
        capability: noneCapability,
      })
    ).toBe("my-event");
  });

  it("never returns dashboard host-community path", () => {
    const path = resolveHostCommunityPlanPath({
      capability: noneCapability,
    });
    expect(path).toBeNull();
    expect(manageHostCommunityHref("slug")).toBe("/host/slug/host-community");
  });

  it("uses cookie host session slug", () => {
    vi.mocked(getHostUserFromCookies).mockReturnValueOnce({
      eventSlug: "from-cookie",
      username: "hostuser",
    });
    expect(
      resolveHostCommunityPlanSlug({
        capability: loadingCapability,
      })
    ).toBe("from-cookie");
  });

  it("uses stale capability slug when no preferred or cookie", () => {
    vi.mocked(getHostUserFromCookies).mockReturnValueOnce(null);
    const capability: HostCapability = {
      status: "stale",
      hostId: "host-test-1",
      eventSlug: "stale-slug",
      username: "u",
    };
    expect(resolveHostCommunityPlanSlug({ capability })).toBe("stale-slug");
  });
});
