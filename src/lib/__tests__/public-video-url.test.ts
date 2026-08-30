import { describe, expect, it } from "vitest";
import {
  VIDEO_DEEP_LINK_PARAM,
  applyVideoDeepLinkQuery,
  buildChannelSharePath,
  buildContentSharePath,
  parseChannelSearchParam,
  pickInitialChannelContent,
} from "../public-video-url";

const EVENT_ID = "11111111-1111-4111-8111-111111111111";
const VIDEO_ID = "22222222-2222-4222-8222-222222222222";
const OTHER_VIDEO_ID = "33333333-3333-4333-8333-333333333333";

describe("public-video-url", () => {
  it("buildContentSharePath emits ?v= video selector", () => {
    expect(
      buildContentSharePath({ eventId: EVENT_ID, channelId: VIDEO_ID })
    ).toBe(`/content/${EVENT_ID}?v=${VIDEO_ID}`);
  });

  it("buildChannelSharePath emits ?v= on channel path", () => {
    expect(
      buildChannelSharePath({ eventId: EVENT_ID, channelId: VIDEO_ID })
    ).toBe(`/channel/${EVENT_ID}?v=${VIDEO_ID}`);
  });

  it("buildContentSharePath omits query when no video id", () => {
    expect(buildContentSharePath({ eventId: EVENT_ID })).toBe(
      `/content/${EVENT_ID}`
    );
  });

  it("parseChannelSearchParam reads v first", () => {
    expect(
      parseChannelSearchParam({
        v: VIDEO_ID,
        channel: OTHER_VIDEO_ID,
      })
    ).toBe(VIDEO_ID);
  });

  it("parseChannelSearchParam reads legacy channel param", () => {
    expect(parseChannelSearchParam({ channel: VIDEO_ID })).toBe(VIDEO_ID);
    expect(parseChannelSearchParam({ channelId: VIDEO_ID })).toBe(VIDEO_ID);
    expect(parseChannelSearchParam({ c: VIDEO_ID })).toBe(VIDEO_ID);
  });

  it("applyVideoDeepLinkQuery sets v param", () => {
    const q = new URLSearchParams();
    applyVideoDeepLinkQuery(q, VIDEO_ID);
    expect(q.get(VIDEO_DEEP_LINK_PARAM)).toBe(VIDEO_ID);
  });

  it("pickInitialChannelContent matches deep link by id", () => {
    const playlist = [
      { id: VIDEO_ID, isDefault: false },
      { id: OTHER_VIDEO_ID, isDefault: true },
    ];
    expect(pickInitialChannelContent(playlist, VIDEO_ID)?.id).toBe(VIDEO_ID);
  });

  it("pickInitialChannelContent prefers isDefault when no deep link", () => {
    const playlist = [
      { id: VIDEO_ID, isDefault: false },
      { id: OTHER_VIDEO_ID, isDefault: true },
    ];
    expect(pickInitialChannelContent(playlist)?.id).toBe(OTHER_VIDEO_ID);
  });

  it("pickInitialChannelContent falls back to first row when no default", () => {
    const playlist = [
      { id: VIDEO_ID, isDefault: false },
      { id: OTHER_VIDEO_ID, isDefault: false },
    ];
    expect(pickInitialChannelContent(playlist)?.id).toBe(VIDEO_ID);
  });

  it("pickInitialChannelContent uses explicit fallback when provided", () => {
    const playlist = [{ id: VIDEO_ID, isDefault: false }];
    const fallback = { id: OTHER_VIDEO_ID, isDefault: false };
    expect(pickInitialChannelContent(playlist, null, fallback)).toBe(fallback);
  });
});
