import { describe, expect, it } from "vitest";

import {
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
});
