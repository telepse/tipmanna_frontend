import { describe, expect, it } from "vitest";

import {
  PLAY_EVENT_PARAM,
  buildCommunityJoinPlayHref,
  buildCreatorProfilePlayHref,
  buildOverlayPlayHref,
  parseOverlayPlayFromSearchParams,
} from "@/lib/playback-overlay-url";

describe("playback-overlay-url", () => {
  it("parses playEvent and v together", () => {
    const sp = new URLSearchParams("playEvent=evt-1&v=ch-1&tab=join");
    expect(parseOverlayPlayFromSearchParams(sp)).toEqual({
      eventId: "evt-1",
      channelId: "ch-1",
    });
  });

  it("builds creator profile play href", () => {
    const href = buildCreatorProfilePlayHref("alice", "evt-1", "ch-1");
    expect(href).toContain("/@alice");
    expect(href).toContain(`${PLAY_EVENT_PARAM}=evt-1`);
    expect(href).toContain("v=ch-1");
  });

  it("builds community join play href", () => {
    const href = buildCommunityJoinPlayHref("comm-1", "evt-1", "ch-1");
    expect(href).toContain("tab=join");
    expect(href).toContain("joinCommunity=comm-1");
    expect(href).toContain(`${PLAY_EVENT_PARAM}=evt-1`);
    expect(href).toContain("v=ch-1");
  });

  it("buildOverlayPlayHref sets and clears play params without trailing ?", () => {
    const withPlay = buildOverlayPlayHref("/@alice", "tab=community", {
      eventId: "evt-1",
      channelId: "ch-1",
    });
    expect(withPlay).toBe("/@alice?tab=community&playEvent=evt-1&v=ch-1");

    const cleared = buildOverlayPlayHref(
      "/@alice",
      withPlay.split("?")[1] ?? "",
      null
    );
    expect(cleared).toBe("/@alice?tab=community");
    expect(cleared.endsWith("?")).toBe(false);

    const bare = buildOverlayPlayHref("/explore", "", null);
    expect(bare).toBe("/explore");
  });
});
