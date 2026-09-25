import { afterEach, describe, expect, it } from "vitest";

import {
  catalogFromMatchingInitial,
  catalogFromPendingInitial,
  resolveDisplayedTvEventCatalog,
  resolveTvEventCatalogInitialState,
} from "@/hooks/use-tv-event-tip-catalog";
import {
  primeTvEventCatalog,
  resetTvEventCatalogCacheForTests,
} from "@/lib/tv-event-catalog-cache";

const char = {
  id: "c1",
  name: "Tip",
  iconUrl: "/a.png",
  price: 5,
  styleName: "Confetti" as const,
};

describe("useTvEventTipCatalog helpers", () => {
  afterEach(() => {
    resetTvEventCatalogCacheForTests();
  });

  it("uses pending initial when client event id is empty", () => {
    const initial = {
      eventId: "event-a",
      characterSets: [{ id: "s1", name: "General", characters: [char] }],
      characters: [char],
    };
    expect(catalogFromPendingInitial(initial)?.characters).toHaveLength(1);
    const state = resolveTvEventCatalogInitialState("", initial);
    expect(state.catalogLoading).toBe(false);
    expect(state.catalog?.characterSets[0].name).toBe("General");
  });

  it("resolveDisplayed denies pending initial when allowPendingInitial is false", () => {
    const initial = {
      eventId: "event-a",
      characterSets: [{ id: "s1", name: "General", characters: [char] }],
      characters: [char],
    };
    const displayed = resolveDisplayedTvEventCatalog({
      eventId: "",
      stored: initial as never,
      storedEventId: "event-a",
      initial,
      allowPendingInitial: false,
    });
    expect(displayed.catalog).toBeNull();
    expect(displayed.catalogEventId).toBe("");
  });

  it("resolveDisplayed ignores stored catalog for mismatched event id", () => {
    const tipmanna = {
      characterSets: [{ id: "s1", name: "General", characters: [char] }],
      characters: [char],
    };
    const displayed = resolveDisplayedTvEventCatalog({
      eventId: "event-b",
      stored: tipmanna,
      storedEventId: "event-a",
      initial: {
        eventId: "event-a",
        characterSets: tipmanna.characterSets,
        characters: tipmanna.characters,
      },
      allowPendingInitial: false,
    });
    expect(displayed.catalog).toBeNull();
    expect(displayed.catalogLoading).toBe(true);
    expect(displayed.catalogEventId).toBe("event-b");
  });

  it("empty event id without initial stays empty", () => {
    const state = resolveTvEventCatalogInitialState("", null);
    expect(state.catalog).toBeNull();
    expect(state.catalogLoading).toBe(false);
  });

  it("uses initial catalog only when event ids match", () => {
    const initial = {
      eventId: "event-a",
      characterSets: [{ id: "s1", name: "General", characters: [char] }],
      characters: [char],
    };
    expect(
      catalogFromMatchingInitial("event-a", initial)?.characterSets
    ).toHaveLength(1);
    expect(catalogFromMatchingInitial("event-b", initial)).toBeNull();
  });

  it("resolveTvEventCatalogInitialState prefers matching initial", () => {
    const state = resolveTvEventCatalogInitialState("event-a", {
      eventId: "event-a",
      characterSets: [{ id: "s1", name: "General", characters: [char] }],
      characters: [char],
    });
    expect(state.catalogLoading).toBe(false);
    expect(state.catalog?.characters).toHaveLength(1);
  });

  it("resolveTvEventCatalogInitialState ignores initial for other events", () => {
    const state = resolveTvEventCatalogInitialState("event-b", {
      eventId: "event-a",
      characterSets: [{ id: "s1", name: "General", characters: [char] }],
      characters: [char],
    });
    expect(state.catalog).toBeNull();
    expect(state.catalogLoading).toBe(true);
  });

  it("resolveTvEventCatalogInitialState uses cache when initial does not match", () => {
    primeTvEventCatalog("event-b", [
      { id: "s1", name: "General", characters: [char] },
    ]);
    const state = resolveTvEventCatalogInitialState("event-b", {
      eventId: "event-a",
      characterSets: [],
      characters: [],
    });
    expect(state.catalogLoading).toBe(false);
    expect(state.catalog?.characterSets[0].name).toBe("General");
  });
});
