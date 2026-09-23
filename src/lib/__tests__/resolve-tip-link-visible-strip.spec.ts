import { describe, expect, it } from "vitest";

import { resolveTipLinkVisibleStrip } from "@/lib/resolve-tip-link-visible-strip";
import type { RoomCharacter } from "@/types";

const char = (id: string): RoomCharacter =>
  ({
    id,
    name: id,
    iconUrl: "/x.png",
    price: 5,
    styleName: "Confetti",
  }) as RoomCharacter;

describe("resolveTipLinkVisibleStrip", () => {
  it("keeps first-paint when non-empty", () => {
    const out = resolveTipLinkVisibleStrip({
      firstPaint: [char("a")],
      liveStrip: [char("b")],
      hydratedPool: [char("c")],
    });
    expect(out.map(c => c.id)).toEqual(["a"]);
  });

  it("uses live strip when first-paint empty", () => {
    const out = resolveTipLinkVisibleStrip({
      firstPaint: [],
      liveStrip: [char("live")],
      hydratedPool: [char("pool")],
    });
    expect(out.map(c => c.id)).toEqual(["live"]);
  });

  it("uses hydrated pool as last resort", () => {
    const out = resolveTipLinkVisibleStrip({
      firstPaint: [],
      liveStrip: [],
      hydratedPool: [char("pool")],
    });
    expect(out.map(c => c.id)).toEqual(["pool"]);
  });
});
