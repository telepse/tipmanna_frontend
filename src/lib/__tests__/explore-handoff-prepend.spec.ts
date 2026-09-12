/**
 * @vitest-environment happy-dom
 */
import { afterEach, describe, expect, it } from "vitest";

import {
  exploreHandoffSwipeNextIndex,
  prependExploreHandoffItem,
} from "../explore-feed-open";
import {
  buildTipLinkExploreHandoff,
  exploreHandoffStaysInReel,
  mergeExploreHandoffTargets,
} from "../explore-video-navigation";
import { buildExploreOpenRowFromSnapshot } from "../explore-open-channel-row";
import { isExploreReelReadyRow } from "../explore-channel-row-merge";

describe("explore handoff prepend simulation", () => {
  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("prepends TipLink snapshot to an existing Trends feed", () => {
    const feed = [
      { id: "A", title: "First" },
      { id: "B", title: "Second" },
      { id: "C", title: "Third" },
    ];
    const handoff = buildTipLinkExploreHandoff({
      channelId: "T",
      eventId: "ev-1",
      url: "https://youtube.com/watch?v=abc",
      title: "TipLink video",
      hostUsername: "hostuser",
    });
    const row = buildExploreOpenRowFromSnapshot(handoff);
    expect(row).not.toBeNull();
    expect(isExploreReelReadyRow(row)).toBe(true);

    const next = prependExploreHandoffItem(feed, "T", row!);
    expect(next.map(i => i.id)).toEqual(["T", "A", "B", "C"]);
    expect(exploreHandoffSwipeNextIndex(next, "T")).toBe(1);
    expect(next[1]?.id).toBe("A");
  });

  it("moves an existing row to front without duplicating", () => {
    const feed = [
      { id: "A", title: "First" },
      { id: "T", title: "TipLink already in feed" },
      { id: "C", title: "Third" },
    ];
    const next = prependExploreHandoffItem(feed, "T", {
      id: "T",
      title: "Should not duplicate",
    });
    expect(next.map(i => i.id)).toEqual(["T", "A", "C"]);
    expect(exploreHandoffSwipeNextIndex(next, "T")).toBe(1);
    expect(next[1]?.id).toBe("A");
  });

  it("prepends from stale index 2 after enrich keeps swipe-down at A", () => {
    const feed = [
      { id: "A", title: "First" },
      { id: "B", title: "Second" },
      { id: "T", title: "TipLink at index 2" },
    ];
    const enriched = {
      id: "T",
      title: "TipLink at index 2",
      event: { amountToRaise: 250 },
    };
    const mergedFeed = feed.map(item =>
      item.id === "T" ? { ...item, ...enriched } : item
    );
    const next = prependExploreHandoffItem(mergedFeed, "T", enriched);
    expect(next.map(i => i.id)).toEqual(["T", "A", "B"]);
    expect(exploreHandoffSwipeNextIndex(next, "T")).toBe(1);
    expect(next[1]?.id).toBe("A");
  });

  it("prepends an existing feed row when enriching a TipLink handoff", () => {
    const feed = [
      { id: "A", title: "First" },
      { id: "T", title: "TipLink already in feed" },
      { id: "C", title: "Third" },
    ];
    const enriched = {
      id: "T",
      title: "TipLink already in feed",
      event: { amountToRaise: 100 },
    };
    const next = prependExploreHandoffItem(
      feed.map(item => (item.id === "T" ? { ...item, ...enriched } : item)),
      "T",
      enriched
    );
    expect(next.map(i => i.id)).toEqual(["T", "A", "C"]);
    expect(
      (next[0] as { event?: { amountToRaise?: number } })?.event?.amountToRaise
    ).toBe(100);
    expect(exploreHandoffSwipeNextIndex(next, "T")).toBe(1);
  });

  it("merges URL target with pending TipLink handoff and stays in reel", () => {
    const pending = buildTipLinkExploreHandoff({
      channelId: "ch-1",
      eventId: "ev-1",
      url: "https://youtube.com/watch?v=abc",
      title: "My video",
      hostUsername: "hostuser",
    });
    const merged = mergeExploreHandoffTargets(
      { videoId: "ch-1", eventId: "ev-1" },
      pending
    );
    expect(merged?.stayInExploreReel).toBe(true);
    expect(exploreHandoffStaysInReel(merged!)).toBe(true);
    expect(isExploreReelReadyRow(merged?.channelSnapshot)).toBe(true);
  });
});
