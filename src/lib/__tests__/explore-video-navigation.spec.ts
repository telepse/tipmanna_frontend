/**
 * @vitest-environment happy-dom
 */
import { afterEach, describe, expect, it } from "vitest";

import {
  buildExploreHandoffTarget,
  buildExploreVideoHandoffHref,
  buildExploreVideoHref,
  buildTipLinkExploreHandoff,
  clearExplorePendingHandoff,
  exploreHandoffStaysInReel,
  exploreOpenTargetFromUrl,
  exploreVideoHandoffKeyFromUrl,
  mergeExploreHandoffTargets,
  normalizeExploreHandoffSnapshot,
  readExploreChannelSnapshot,
  readExplorePendingHandoff,
  stashExploreChannelSnapshot,
  stashExplorePendingHandoff,
} from "../explore-video-navigation";

describe("explore video navigation", () => {
  afterEach(() => {
    clearExplorePendingHandoff();
    localStorage.clear();
    sessionStorage.clear();
  });

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

  describe("normalizeExploreHandoffSnapshot", () => {
    it("adds url, liveStatus, id, and event.id for playable handoff", () => {
      const row = normalizeExploreHandoffSnapshot(
        { title: "Clip" },
        "vid-1",
        "evt-1"
      );
      expect(row.id).toBe("vid-1");
      expect(row.url).toBe("");
      expect(row.liveStatus).toBe("NOT_LIVE");
      expect(row.event).toEqual({ id: "evt-1" });
    });
  });

  describe("buildExploreHandoffTarget", () => {
    it("returns null without ids", () => {
      expect(buildExploreHandoffTarget({ id: "vid" })).toBeNull();
    });

    it("builds a normalized target from content rows", () => {
      expect(
        buildExploreHandoffTarget({
          id: "vid-1",
          url: "https://www.youtube.com/watch?v=abc",
          event: { id: "evt-1" },
        })
      ).toEqual({
        videoId: "vid-1",
        eventId: "evt-1",
        channelSnapshot: {
          id: "vid-1",
          url: "https://www.youtube.com/watch?v=abc",
          liveStatus: "NOT_LIVE",
          event: { id: "evt-1" },
        },
      });
    });
  });

  describe("buildExploreVideoHref", () => {
    it("uses feed trends handoff params without legacy tab=feed", () => {
      const href = buildExploreVideoHref({
        videoId: "vid-1",
        eventId: "evt-1",
      });
      const sp = new URLSearchParams(href.split("?")[1] ?? "");
      expect(sp.get("feedTab")).toBe("trends");
      expect(sp.get("channel")).toBe("vid-1");
      expect(sp.get("eventId")).toBe("evt-1");
      expect(sp.get("tab")).toBeNull();
      expect(sp.get("from")).toBeNull();
    });

    it("adds from=tiplink when stayInExploreReel is set", () => {
      const href = buildExploreVideoHref({
        videoId: "vid-1",
        eventId: "evt-1",
        stayInExploreReel: true,
      });
      const sp = new URLSearchParams(href.split("?")[1] ?? "");
      expect(sp.get("from")).toBe("tiplink");
    });
  });

  describe("buildTipLinkExploreHandoff", () => {
    it("builds a reel-ready snapshot with stayInExploreReel", () => {
      const target = buildTipLinkExploreHandoff({
        channelId: "ch-1",
        eventId: "ev-1",
        url: "https://youtube.com/watch?v=abc",
        title: "My video",
        hostUsername: "hostuser",
      });
      expect(target.stayInExploreReel).toBe(true);
      expect(target.videoId).toBe("ch-1");
      expect(target.channelSnapshot?.url).toBe(
        "https://youtube.com/watch?v=abc"
      );
      expect(target.channelSnapshot?.liveStatus).toBe("NOT_LIVE");
      expect(
        (target.channelSnapshot?.event as { username?: string })?.username
      ).toBe("hostuser");
    });
  });

  describe("exploreOpenTargetFromUrl tiplink flag", () => {
    it("parses stayInExploreReel from from=tiplink", () => {
      const sp = new URLSearchParams({
        channel: "vid-1",
        eventId: "evt-1",
        from: "tiplink",
      });
      expect(exploreOpenTargetFromUrl(sp)).toEqual({
        videoId: "vid-1",
        eventId: "evt-1",
        stayInExploreReel: true,
      });
    });

    it("reads channel snapshot stashed in localStorage (cross-tab)", () => {
      const snapshot = {
        id: "vid-1",
        url: "https://www.youtube.com/watch?v=abc",
        title: "Clip",
        liveStatus: "NOT_LIVE",
        event: { id: "evt-1" },
      };
      stashExploreChannelSnapshot("vid-1", snapshot);
      const sp = new URLSearchParams({
        channel: "vid-1",
        eventId: "evt-1",
        from: "tiplink",
      });
      expect(exploreOpenTargetFromUrl(sp)).toEqual({
        videoId: "vid-1",
        eventId: "evt-1",
        channelSnapshot: snapshot,
        stayInExploreReel: true,
      });
      expect(readExploreChannelSnapshot("vid-1")).toEqual(snapshot);
    });
  });

  describe("localStorage pending handoff", () => {
    it("round-trips pending handoff including stayInExploreReel", () => {
      const target = buildTipLinkExploreHandoff({
        channelId: "ch-1",
        eventId: "ev-1",
        url: "https://youtube.com/watch?v=abc",
        title: "My video",
        hostUsername: "hostuser",
      });
      stashExplorePendingHandoff(target);
      expect(readExplorePendingHandoff()).toEqual(target);
    });
  });

  describe("mergeExploreHandoffTargets", () => {
    it("merges pending snapshot and stayInExploreReel onto URL target", () => {
      const pending = buildTipLinkExploreHandoff({
        channelId: "ch-1",
        eventId: "ev-1",
        url: "https://youtube.com/watch?v=abc",
        title: "My video",
        hostUsername: "hostuser",
      });
      const urlTarget = {
        videoId: "ch-1",
        eventId: "ev-1",
      };
      expect(mergeExploreHandoffTargets(urlTarget, pending)).toEqual({
        videoId: "ch-1",
        eventId: "ev-1",
        channelSnapshot: pending.channelSnapshot,
        stayInExploreReel: true,
      });
    });

    it("returns null when both inputs are null", () => {
      expect(mergeExploreHandoffTargets(null, null)).toBeNull();
    });
  });

  describe("exploreHandoffStaysInReel", () => {
    it("returns true only when stayInExploreReel is set", () => {
      expect(
        exploreHandoffStaysInReel({
          videoId: "v",
          eventId: "e",
          stayInExploreReel: true,
        })
      ).toBe(true);
      expect(exploreHandoffStaysInReel({ videoId: "v", eventId: "e" })).toBe(
        false
      );
    });
  });
});
