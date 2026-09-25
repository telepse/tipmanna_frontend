import { describe, expect, it } from "vitest";

import {
  buildOverlayPayloadFromChannelData,
  buildOverlaySeedContentRow,
  mergeOverlayCatalogOntoPayload,
  overlayPayloadFromSeed,
  playableContentsFromChannelRows,
  shouldSurfaceOverlayLoadError,
} from "../content-playback-overlay-seed";

describe("content-playback-overlay-seed", () => {
  it("builds a minimal playable row from seed", () => {
    const row = buildOverlaySeedContentRow({
      eventId: "evt-1",
      channelId: "ch-1",
      url: "https://www.youtube.com/watch?v=abc",
      title: "My video",
    });
    expect(row).toMatchObject({
      id: "ch-1",
      url: "https://www.youtube.com/watch?v=abc",
      title: "My video",
      restricted: false,
    });
  });

  it("overlayPayloadFromSeed allows empty catalog", () => {
    const payload = overlayPayloadFromSeed({
      eventId: "evt-1",
      channelId: "ch-1",
      url: "https://www.youtube.com/watch?v=abc",
    });
    expect(payload?.contents).toHaveLength(1);
    expect(payload?.characters).toEqual([]);
    expect(payload?.characterSets).toEqual([]);
  });

  it("mergeOverlayCatalogOntoPayload keeps contents reference", () => {
    const base = overlayPayloadFromSeed({
      eventId: "evt-1",
      channelId: "ch-1",
      url: "https://www.youtube.com/watch?v=abc",
    })!;
    const contentsRef = base.contents;
    const merged = mergeOverlayCatalogOntoPayload(base, {
      characters: [{ id: "c1" }],
      characterSets: [{ id: "s1" }],
    });
    expect(merged.contents).toBe(contentsRef);
    expect(merged.characters).toEqual([{ id: "c1" }]);
    expect(merged.characterSets).toEqual([{ id: "s1" }]);
  });

  it("buildOverlayPayloadFromChannelData prefers non-restricted rows", () => {
    const payload = buildOverlayPayloadFromChannelData({
      formattedContents: [
        { id: "a", restricted: true },
        { id: "b", restricted: false },
      ],
    });
    expect(payload?.contents).toEqual([{ id: "b", restricted: false }]);
  });

  it("playableContentsFromChannelRows falls back to all rows when all restricted", () => {
    const rows = [{ id: "a", restricted: true }];
    expect(playableContentsFromChannelRows(rows)).toEqual(rows);
  });

  describe("shouldSurfaceOverlayLoadError", () => {
    it("surfaces error only when not cancelled and playback never mounted", () => {
      expect(
        shouldSurfaceOverlayLoadError({
          cancelled: false,
          playbackMounted: false,
        })
      ).toBe(true);
      expect(
        shouldSurfaceOverlayLoadError({
          cancelled: false,
          playbackMounted: true,
        })
      ).toBe(false);
      expect(
        shouldSurfaceOverlayLoadError({
          cancelled: true,
          playbackMounted: false,
        })
      ).toBe(false);
    });
  });
});
