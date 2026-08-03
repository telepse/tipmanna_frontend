import { describe, expect, it } from "vitest";

import {
  buildExploreVideoHandoffHref,
  exploreOpenTargetFromUrl,
  exploreVideoHandoffKeyFromUrl,
} from "../explore-video-navigation";

describe("explore video navigation", () => {
  describe("exploreVideoHandoffKeyFromUrl", () => {
    it("returns channel:eventId when both params are present", () => {
      const sp = new URLSearchParams({
        channel: "vid-1",
        eventId: "evt-1",
      });
      expect(exploreVideoHandoffKeyFromUrl(sp)).toBe("vid-1:evt-1");
    });

    it("trims whitespace from params", () => {
      const sp = new URLSearchParams({
        channel: "  vid-1  ",
        eventId: "  evt-1  ",
      });
      expect(exploreVideoHandoffKeyFromUrl(sp)).toBe("vid-1:evt-1");
    });

    it("returns null when channel is missing", () => {
      const sp = new URLSearchParams({ eventId: "evt-1" });
      expect(exploreVideoHandoffKeyFromUrl(sp)).toBeNull();
    });

    it("returns null when eventId is missing", () => {
      const sp = new URLSearchParams({ channel: "vid-1" });
      expect(exploreVideoHandoffKeyFromUrl(sp)).toBeNull();
    });

    it("returns null when params are blank", () => {
      const sp = new URLSearchParams({ channel: "  ", eventId: "evt-1" });
      expect(exploreVideoHandoffKeyFromUrl(sp)).toBeNull();
    });
  });

  describe("exploreOpenTargetFromUrl", () => {
    it("returns a target when channel and eventId are present", () => {
      const sp = new URLSearchParams({
        channel: "vid-1",
        eventId: "evt-1",
      });
      expect(exploreOpenTargetFromUrl(sp)).toEqual({
        videoId: "vid-1",
        eventId: "evt-1",
      });
    });

    it("returns null when handoff params are incomplete", () => {
      expect(exploreOpenTargetFromUrl(new URLSearchParams())).toBeNull();
    });
  });

  describe("buildExploreVideoHandoffHref", () => {
    it("preserves existing query keys while adding handoff params", () => {
      const href = buildExploreVideoHandoffHref(
        { videoId: "vid-1", eventId: "evt-1" },
        "e2e=1&feedTab=saves"
      );
      const sp = new URLSearchParams(href.split("?")[1] ?? "");
      expect(sp.get("e2e")).toBe("1");
      expect(sp.get("feedTab")).toBe("trends");
      expect(sp.get("channel")).toBe("vid-1");
      expect(sp.get("eventId")).toBe("evt-1");
      expect(sp.get("tab")).toBeNull();
    });

    it("clears tab and join params from the live query", () => {
      const href = buildExploreVideoHandoffHref(
        { videoId: "vid-2", eventId: "evt-2" },
        "tab=discover&joinCommunity=abc&e2e=1"
      );
      const sp = new URLSearchParams(href.split("?")[1] ?? "");
      expect(sp.get("tab")).toBeNull();
      expect(sp.get("joinCommunity")).toBeNull();
      expect(sp.get("channel")).toBe("vid-2");
      expect(sp.get("eventId")).toBe("evt-2");
      expect(sp.get("e2e")).toBe("1");
    });
  });
});
