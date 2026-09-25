import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/actions/events", () => ({
  getEventCharacterCatalogAction: vi.fn(),
}));

import { getEventCharacterCatalogAction } from "@/actions/events";
import {
  collectTvScheduleEventIdsFromIndex,
  getCachedTvEventCatalog,
  loadTvEventCatalog,
  prefetchTvEventCatalogs,
  resetTvEventCatalogCacheForTests,
  unwrapCharacterSetsFromActionData,
} from "@/lib/tv-event-catalog-cache";

const mockAction = vi.mocked(getEventCharacterCatalogAction);

describe("tv-event-catalog-cache", () => {
  beforeEach(() => {
    resetTvEventCatalogCacheForTests();
    mockAction.mockReset();
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.clear();
    }
  });

  afterEach(() => {
    resetTvEventCatalogCacheForTests();
  });

  it("does not cache failed catalog responses", async () => {
    mockAction.mockResolvedValue({
      success: false,
      error: "fail",
    } as never);

    const result = await loadTvEventCatalog("event-1");
    expect(result).toBeNull();
    expect(getCachedTvEventCatalog("event-1")).toBeNull();
    expect(mockAction).toHaveBeenCalledTimes(2);
  });

  it("caches successful empty catalog", async () => {
    mockAction.mockResolvedValue({
      success: true,
      data: { eventId: "event-1", characterSets: [] },
    } as never);

    const result = await loadTvEventCatalog("event-1");
    expect(result).toEqual({ characterSets: [], characters: [] });
    expect(getCachedTvEventCatalog("event-1")).toEqual({
      characterSets: [],
      characters: [],
    });
    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  it("caches successful populated catalog", async () => {
    mockAction.mockResolvedValue({
      success: true,
      data: {
        eventId: "event-1",
        characterSets: [
          {
            id: "s1",
            name: "General",
            characters: [
              {
                id: "c1",
                name: "Tip",
                iconUrl: "/a.png",
                price: 5,
                styleName: "Confetti",
              },
            ],
          },
        ],
      },
    } as never);

    const result = await loadTvEventCatalog("event-1");
    expect(result?.characterSets).toHaveLength(1);
    expect(getCachedTvEventCatalog("event-1")?.characterSets[0].name).toBe(
      "General"
    );
  });

  it("prefetch can retry after failure without sticky empty cache", async () => {
    mockAction
      .mockResolvedValueOnce({ success: false, error: "fail" } as never)
      .mockResolvedValueOnce({ success: false, error: "fail" } as never);

    await loadTvEventCatalog("event-1");
    expect(getCachedTvEventCatalog("event-1")).toBeNull();

    mockAction.mockResolvedValue({
      success: true,
      data: {
        eventId: "event-1",
        characterSets: [
          {
            id: "s1",
            name: "General",
            characters: [
              {
                id: "c1",
                name: "Tip",
                iconUrl: "/a.png",
                price: 5,
                styleName: "Confetti",
              },
            ],
          },
        ],
      },
    } as never);

    prefetchTvEventCatalogs(["event-1"]);
    await vi.waitFor(() => {
      expect(getCachedTvEventCatalog("event-1")).not.toBeNull();
    });
  });

  it("ignores poisoned v1 session keys", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("window", globalThis);
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, val: string) => {
        store.set(key, val);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
    });
    store.set(
      "tv-event-catalog-v1:event-1",
      JSON.stringify({ characterSets: [], characters: [] })
    );
    expect(getCachedTvEventCatalog("event-1")).toBeNull();
  });

  it("unwrapCharacterSetsFromActionData reads nested data.characterSets", () => {
    expect(
      unwrapCharacterSetsFromActionData({
        data: { characterSets: [{ id: "s1" }] },
      })
    ).toEqual([{ id: "s1" }]);
  });

  it("collectTvScheduleEventIdsFromIndex returns unique ids in window", () => {
    const items = [
      { channel: { eventId: "a" } },
      { channel: { eventId: "a" } },
      { defaultChannelEventId: "b" },
      { defaultChannelEventId: "c" },
    ];
    expect(collectTvScheduleEventIdsFromIndex(items, 0, 4)).toEqual([
      "a",
      "b",
      "c",
    ]);
    expect(collectTvScheduleEventIdsFromIndex(items, 1, 2)).toEqual(["a", "b"]);
  });
});
