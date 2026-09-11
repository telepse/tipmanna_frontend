import { describe, expect, it } from "vitest";

import { buildTipPresentation } from "@/lib/merge-tip-config";
import type { TipConfigPayload } from "@/lib/tip-config-types";
import type { RoomCharacter } from "@/types";

const basePayload = (): TipConfigPayload => ({
  ctaSectionLabel: "Engage",
  ctaPayLabel: "Pay",
  currency: "GBP",
  textCharacter: {
    enabled: true,
    priceMinor: 500,
    maxLength: 500,
    priceTouchedByHost: false,
  },
  sectionItems: [],
  drawerItems: [
    {
      itemId: "11111111-1111-1111-1111-111111111111",
      kind: "default",
      characterId: "11111111-1111-1111-1111-111111111111",
      priceMinor: 500,
      position: 1,
    },
  ],
  eliteCharacterIds: ["22222222-2222-2222-2222-222222222222"],
});

describe("buildTipPresentation elite injection", () => {
  it("injects elite stubs not already in drawerItems", () => {
    const base: RoomCharacter[] = [
      {
        id: "11111111-1111-1111-1111-111111111111",
        name: "General",
        iconUrl: "/a.png",
        price: 5,
        styleName: "Confetti",
      },
    ];
    const eliteStub: RoomCharacter[] = [
      {
        id: "22222222-2222-2222-2222-222222222222",
        name: "Elite Star",
        iconUrl: "/e.png",
        price: 10,
        styleName: "Galaxy",
      },
    ];
    const p = buildTipPresentation(base, basePayload(), 1, eliteStub);
    expect(p.drawerSets).toEqual([]);
    expect(p.allEnriched.some(c => c.id === eliteStub[0].id)).toBe(true);
    expect(p.sectionStrip.some(c => c.id === eliteStub[0].id)).toBe(true);
  });
});
