import { describe, expect, it } from "vitest";

import {
  buildCommunityTvHref,
  buildHostPremiumHref,
  parseCommunityTvTab,
  parseHostCommunityTab,
  parseHostPremiumTab,
} from "@/lib/host-dashboard-shortcuts";

describe("host-dashboard-shortcuts", () => {
  it("builds premium href with tab", () => {
    expect(buildHostPremiumHref("my-host", "playlist")).toBe(
      "/host/my-host/host-premium?tab=playlist"
    );
  });

  it("parses premium tabs from allowlist", () => {
    expect(parseHostPremiumTab("event_room_access_control")).toBe(
      "event_room_access_control"
    );
    expect(parseHostPremiumTab("channel_manage")).toBeNull();
    expect(parseHostPremiumTab("nope")).toBeNull();
  });

  it("parses community tabs from allowlist", () => {
    expect(parseHostCommunityTab("subscribers")).toBe("subscribers");
    expect(parseHostCommunityTab("sends")).toBeNull();
  });

  it("parses TV tabs with schedule fallback", () => {
    expect(parseCommunityTvTab("reminders")).toBe("reminders");
    expect(parseCommunityTvTab(null)).toBe("schedule");
    expect(parseCommunityTvTab("bad")).toBe("schedule");
  });

  it("builds community TV reminders deep link", () => {
    expect(buildCommunityTvHref("slug", "comm-1", "reminders")).toBe(
      "/host/slug/community-tv?communityId=comm-1&tab=reminders"
    );
  });
});
