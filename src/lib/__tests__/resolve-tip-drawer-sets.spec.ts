import { describe, expect, it } from "vitest";

import {
  buildFallbackDrawerSetsFromCharacters,
  buildPublicTipStripPool,
  buildPublishedEliteDrawerSet,
  drawerCharactersForStrip,
  isEliteCharacterSetName,
  mergeCharacterPools,
  overlayStripPrices,
  pinCommentFirstOnDrawerSets,
  PUBLIC_STRIP_POOL_MAX,
  resolveTipDrawerPresentation,
  resolveTipDrawerSets,
  holdTvTipLastGood,
  shouldPublishTvTipPresentation,
  sortDrawerCharacterSets,
} from "@/lib/resolve-tip-drawer-sets";
import { shuffleTipStrip } from "@/lib/shuffle-tip-strip";
import type { RoomCharacter } from "@/types";

const char = (id: string, price: number, name = id): RoomCharacter => ({
  id,
  name,
  iconUrl: "/a.png",
  price,
  styleName: "Confetti",
});

const comment = (): RoomCharacter =>
  ({
    id: "comment-1",
    name: "Add Comment",
    iconUrl: "/c.png",
    price: 5,
    styleName: "Confetti",
    type: "comment",
  }) as RoomCharacter;

describe("resolveTipDrawerSets", () => {
  it("keeps assigned catalog sets as tabs with live prices overlaid", () => {
    const sets = [
      { id: "s1", name: "General", characters: [char("a", 5)] },
      { id: "s2", name: "Conference", characters: [char("b", 15)] },
    ];
    const priceCatalog = [
      { ...char("a", 5), price: 7 },
      { ...char("b", 15), price: 20 },
    ];
    const out = resolveTipDrawerSets(sets, priceCatalog);
    expect(out).toHaveLength(2);
    expect(out.map(s => s.name)).toEqual(["General", "Conference"]);
    expect(out[0].characters[0].price).toBe(7);
    expect(out[1].characters[0].price).toBe(20);
  });

  it("pins assigned Elite set first without flattening into Tips", () => {
    const sets = [
      { id: "s1", name: "General", characters: [char("a", 5)] },
      { id: "s2", name: "Elite Growth", characters: [char("e", 10)] },
      { id: "s3", name: "Conference", characters: [char("b", 15)] },
    ];
    const out = resolveTipDrawerSets(sets, null);
    expect(out.map(s => s.name)).toEqual([
      "Elite Growth",
      "General",
      "Conference",
    ]);
    expect(out.some(s => s.name === "Tips")).toBe(false);
  });

  it("falls back to strip set when catalog is empty", () => {
    const fallback = [
      { id: "strip", name: "Tips", characters: [char("c", 5)] },
    ];
    const out = resolveTipDrawerSets([], null, fallback);
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe("Tips");
  });

  it("omits comment characters from drawer tab membership", () => {
    const sets = [
      {
        id: "s1",
        name: "General",
        characters: [char("a", 5), { ...comment(), id: "t" }],
      },
    ];
    const out = resolveTipDrawerSets(sets, null);
    expect(out[0].characters).toHaveLength(1);
    expect(out[0].characters[0].id).toBe("a");
  });
});

describe("resolveTipDrawerPresentation", () => {
  it("pins comment first on every tab and builds strip pool", () => {
    const text = comment();
    const sets = [
      {
        id: "s1",
        name: "General",
        characters: [char("a", 5), text],
      },
      {
        id: "s2",
        name: "Premium",
        characters: [char("b", 10)],
      },
    ];
    const { drawerSets, stripPool } = resolveTipDrawerPresentation(sets, [
      text,
      char("a", 5),
      char("b", 10),
    ]);
    expect(drawerSets.map(s => s.name)).toEqual(["General", "Premium"]);
    expect(drawerSets[0].characters[0].id).toBe(text.id);
    expect(drawerSets[1].characters[0].id).toBe(text.id);
    expect(stripPool.map(c => c.id)).toEqual(
      expect.arrayContaining([text.id, "a", "b"])
    );
  });

  it("adds synthetic Elite tab from published eliteCharacterIds", () => {
    const text = comment();
    const sets = [{ id: "s1", name: "General", characters: [char("a", 5)] }];
    const catalog = [text, char("a", 5), char("e1", 10), char("e2", 12)];
    const { drawerSets } = resolveTipDrawerPresentation(
      sets,
      catalog,
      undefined,
      ["e1", "e2"]
    );
    expect(drawerSets.map(s => s.name)).toEqual(["Elite", "General"]);
    expect(drawerSets[0].characters.map(c => c.id)).toEqual([
      text.id,
      "e1",
      "e2",
    ]);
  });

  it("does not duplicate Elite tab when an assigned Elite set exists", () => {
    const sets = [
      { id: "s1", name: "Elite Growth", characters: [char("e1", 10)] },
      { id: "s2", name: "General", characters: [char("a", 5)] },
    ];
    const { drawerSets } = resolveTipDrawerPresentation(
      sets,
      [char("e1", 10), char("a", 5), char("e2", 12)],
      undefined,
      ["e2"]
    );
    expect(
      drawerSets.filter(s => isEliteCharacterSetName(s.name))
    ).toHaveLength(1);
    expect(drawerSets[0].name).toBe("Elite Growth");
  });
});

describe("buildPublicTipStripPool", () => {
  it("includes comment, elite ids, drawer sets, and catalog for shuffle fill", () => {
    const text = comment();
    const drawerSets = [
      { id: "s1", name: "General", characters: [char("a", 5)] },
    ];
    const catalog = [
      text,
      char("e1", 10),
      char("e2", 12),
      ...Array.from({ length: 25 }, (_, i) => char(`c${i}`, 5 + i)),
    ];
    const pool = buildPublicTipStripPool(
      drawerSets,
      catalog,
      ["e1", "e2"],
      text
    );
    expect(pool.map(c => c.id)).toEqual(
      expect.arrayContaining(["comment-1", "e1", "e2", "a", "c0", "c24"])
    );
    const strip = shuffleTipStrip(pool, ["e1", "e2"]);
    expect(strip).toHaveLength(PUBLIC_STRIP_POOL_MAX);
    expect(strip[0].id).toBe(text.id);
    expect(strip.some(c => c.id === "e1")).toBe(true);
    expect(strip.some(c => c.id === "e2")).toBe(true);
  });
});

describe("buildPublishedEliteDrawerSet", () => {
  it("returns null when no elite ids resolve in catalog", () => {
    expect(buildPublishedEliteDrawerSet(["missing"], [])).toBeNull();
  });
});

describe("mergeCharacterPools", () => {
  it("dedupes by id and keeps the last pool entry", () => {
    const merged = mergeCharacterPools(
      [char("a", 5, "Strip A")],
      [char("a", 7, "Catalog A"), char("b", 10)]
    );
    expect(merged).toHaveLength(2);
    expect(merged.find(c => c.id === "a")?.price).toBe(7);
  });
});

describe("overlayStripPrices", () => {
  it("keeps strip order while applying live prices", () => {
    const strip = [char("a", 5), char("b", 8)];
    const catalog = [char("a", 9), char("b", 12), char("c", 15)];
    const out = overlayStripPrices(strip, catalog);
    expect(out.map(c => c.id)).toEqual(["a", "b"]);
    expect(out[0].price).toBe(9);
    expect(out[1].price).toBe(12);
  });
});

describe("pinCommentFirstOnDrawerSets", () => {
  it("prepends comment and dedupes within each tab", () => {
    const text = comment();
    const sets = [
      {
        id: "s1",
        name: "General",
        characters: [text, char("a", 5)],
      },
    ];
    const out = pinCommentFirstOnDrawerSets(sets, text);
    expect(out[0].characters.map(c => c.id)).toEqual([text.id, "a"]);
  });
});

describe("drawerCharactersForStrip", () => {
  it("dedupes characters across tabs", () => {
    const pool = drawerCharactersForStrip([
      { id: "s1", name: "General", characters: [char("a", 5), char("b", 7)] },
      { id: "s2", name: "Premium", characters: [char("b", 7), char("c", 9)] },
    ]);
    expect(pool.map(c => c.id).sort()).toEqual(["a", "b", "c"]);
  });
});

describe("buildFallbackDrawerSetsFromCharacters", () => {
  it("builds a single Tips set from enriched characters", () => {
    const out = buildFallbackDrawerSetsFromCharacters([
      char("a", 5),
      char("b", 7),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe("Tips");
    expect(out[0].characters).toHaveLength(2);
  });
});

describe("sortDrawerCharacterSets", () => {
  it("orders Elite, General, Premium, then the rest", () => {
    const sorted = sortDrawerCharacterSets([
      { name: "Conference", characters: [] },
      { name: "Premium", characters: [] },
      { name: "General", characters: [] },
      { name: "Elite Growth", characters: [] },
    ]);
    expect(sorted.map(s => s.name)).toEqual([
      "Elite Growth",
      "General",
      "Premium",
      "Conference",
    ]);
  });

  it("detects elite set names case-insensitively", () => {
    expect(isEliteCharacterSetName("Elite Growth")).toBe(true);
    expect(isEliteCharacterSetName("general")).toBe(false);
    const sorted = sortDrawerCharacterSets([
      { name: "General", characters: [] },
      { name: "premium elite", characters: [] },
    ]);
    expect(sorted[0].name).toBe("premium elite");
  });
});

describe("holdTvTipLastGood", () => {
  const char = (id: string) => ({
    id,
    name: id,
    iconUrl: "/a.png",
    price: 5,
    styleName: "Confetti" as const,
  });

  it("does not write last-good when catalog owner mismatches drawer event id", () => {
    const next = {
      drawerSets: [{ id: "s1", name: "General", characters: [char("x")] }],
      stripPool: [char("x")],
    };
    const result = holdTvTipLastGood({
      tipDrawerEventId: "event-b",
      catalogEventId: "event-a",
      next,
      held: null,
    });
    expect(result.held).toBeNull();
    expect(result.presentation.stripPool).toHaveLength(1);
  });

  it("holds same-event empty strip from prior good presentation", () => {
    const heldStrip = [char("y")];
    const held = {
      eventId: "event-a",
      drawerSets: [{ id: "s1", name: "General", characters: heldStrip }],
      stripPool: heldStrip,
    };
    const result = holdTvTipLastGood({
      tipDrawerEventId: "event-a",
      catalogEventId: "event-a",
      next: { drawerSets: [], stripPool: [] },
      held,
    });
    expect(result.presentation.stripPool).toEqual(heldStrip);
    expect(result.held).toEqual(held);
  });

  it("does not reuse held when drawer event id changed", () => {
    const held = {
      eventId: "event-a",
      drawerSets: [{ id: "s1", name: "General", characters: [char("z")] }],
      stripPool: [char("z")],
    };
    const result = holdTvTipLastGood({
      tipDrawerEventId: "event-b",
      catalogEventId: "event-b",
      next: { drawerSets: [], stripPool: [] },
      held,
    });
    expect(result.presentation.stripPool).toHaveLength(0);
  });
});

describe("shouldPublishTvTipPresentation", () => {
  it("still publishes while catalog is loading (Elite-only is allowed; blank strip is not)", () => {
    expect(
      shouldPublishTvTipPresentation({
        catalogLoading: true,
        assignedSetCount: 0,
        eliteCharacterIdCount: 2,
      })
    ).toBe(true);
  });

  it("publishes assigned General/Premium plus elite ids without PLAYING", () => {
    expect(
      shouldPublishTvTipPresentation({
        catalogLoading: false,
        assignedSetCount: 2,
        eliteCharacterIdCount: 2,
      })
    ).toBe(true);
    const text = comment();
    const { drawerSets } = resolveTipDrawerPresentation(
      [
        { id: "s1", name: "General", characters: [char("a", 5)] },
        { id: "s2", name: "Premium", characters: [char("b", 10)] },
      ],
      [text, char("a", 5), char("b", 10), char("e1", 12)],
      undefined,
      ["e1"]
    );
    expect(drawerSets.map(s => s.name)).toEqual([
      "Elite",
      "General",
      "Premium",
    ]);
  });
});
