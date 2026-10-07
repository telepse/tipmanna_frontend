import { describe, expect, it } from "vitest";

import { resolveTvCommunitySourceDeferral } from "@/lib/tv-community-source-deferral";

describe("resolveTvCommunitySourceDeferral", () => {
  it("/tv global — no community query or storage", () => {
    expect(
      resolveTvCommunitySourceDeferral({
        videoId: null,
        communityQuery: null,
        storedCommunityId: null,
        sideChickLocked: false,
      })
    ).toEqual({ kind: "global", activateGlobal: true });
  });

  it("videoId forces global fullscreen source", () => {
    expect(
      resolveTvCommunitySourceDeferral({
        videoId: "yt123",
        communityQuery: "comm-1",
        storedCommunityId: "comm-1",
        sideChickLocked: false,
      })
    ).toEqual({ kind: "video_fullscreen", activateGlobal: true });
  });

  it("?community= defers activation (pending intent)", () => {
    expect(
      resolveTvCommunitySourceDeferral({
        videoId: null,
        communityQuery: "comm-a",
        storedCommunityId: null,
        sideChickLocked: false,
      })
    ).toEqual({ kind: "defer", communityIntentId: "comm-a" });
  });

  it("localStorage community id defers until gate (no silent activation)", () => {
    expect(
      resolveTvCommunitySourceDeferral({
        videoId: null,
        communityQuery: null,
        storedCommunityId: "stored-comm",
        sideChickLocked: false,
      })
    ).toEqual({ kind: "defer", communityIntentId: "stored-comm" });
  });

  it("query wins over stored when both present", () => {
    expect(
      resolveTvCommunitySourceDeferral({
        videoId: null,
        communityQuery: "from-url",
        storedCommunityId: "stored-comm",
        sideChickLocked: false,
      })
    ).toEqual({ kind: "defer", communityIntentId: "from-url" });
  });

  it("side-chick locked still defers community query", () => {
    expect(
      resolveTvCommunitySourceDeferral({
        videoId: null,
        communityQuery: "dedicated-comm",
        storedCommunityId: null,
        sideChickLocked: true,
      })
    ).toEqual({ kind: "defer", communityIntentId: "dedicated-comm" });
  });
});
