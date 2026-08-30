import { describe, expect, it } from "vitest";

import { buildSurfaceTipPriceCatalog } from "../surface-tip-price-catalog";

describe("buildSurfaceTipPriceCatalog", () => {
  it("prefers enriched host prices over raw video catalog", () => {
    const catalog = buildSurfaceTipPriceCatalog({
      enrichedCatalog: [
        {
          id: "c1",
          name: "Burger",
          iconUrl: "/b.png",
          price: 12,
          styleName: "Confetti",
        },
      ],
      videoCatalog: [
        {
          id: "c1",
          name: "Burger",
          iconUrl: "/b.png",
          price: 5,
          styleName: "Confetti",
        },
      ],
    });

    expect(catalog.find(c => c.id === "c1")?.price).toBe(12);
  });

  it("falls back when video catalog is empty", () => {
    const catalog = buildSurfaceTipPriceCatalog({
      enrichedCatalog: [],
      videoCatalog: [],
      fallbackCatalog: [
        {
          id: "c2",
          name: "Chicken",
          iconUrl: "/c.png",
          price: 7,
          styleName: "Confetti",
        },
      ],
    });

    expect(catalog).toHaveLength(1);
    expect(catalog[0]?.name).toBe("Chicken");
  });
});
