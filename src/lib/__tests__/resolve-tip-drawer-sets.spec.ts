import { describe, expect, it } from "vitest";

import {
  buildFallbackDrawerSetsFromCharacters,
  isEliteCharacterSetName,
  mergeCharacterPools,
  overlayStripPrices,
  resolveTipDrawerSets,
  sortDrawerCharacterSets,
} from "@/lib/resolve-tip-drawer-sets";
import type { RoomCharacter } from "@/types";

const char = (id: string, price: number, name = id): RoomCharacter => ({
  id,
  name,
  iconUrl: "/a.png",
  price,
  styleName: "Confetti",
});

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

  it("omits comment characters from drawer tabs", () => {
    const sets = [
      {
        id: "s1",
        name: "General",
        characters: [
          char("a", 5),
          { ...char("t", 5, "Add Comment"), type: "comment" } as RoomCharacter,
        ],
      },
    ];
    const out = resolveTipDrawerSets(sets, null);
    expect(out[0].characters).toHaveLength(1);
    expect(out[0].characters[0].id).toBe("a");
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
