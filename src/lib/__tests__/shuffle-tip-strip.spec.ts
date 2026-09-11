import { describe, expect, it } from "vitest";

import { shuffleTipStrip } from "@/lib/shuffle-tip-strip";
import type { RoomCharacter } from "@/types";

const chars = (ids: string[]): RoomCharacter[] =>
  ids.map(id => ({
    id,
    name: id,
    iconUrl: `/icons/${id}.png`,
    price: 5,
    styleName: "Confetti",
    type: id === "text-1" ? "comment" : "tip",
  }));

describe("shuffleTipStrip", () => {
  it("pins comment first when present", () => {
    const strip = shuffleTipStrip(chars(["a", "b", "text-1"]), [], 20);
    expect(strip[0]?.id).toBe("text-1");
  });

  it("places elite ids before non-elite in shuffled strip", () => {
    const strip = shuffleTipStrip(
      chars(["a", "b", "c", "d", "elite-1", "elite-2"]),
      ["elite-1", "elite-2"],
      20
    );
    const nonComment = strip.filter(c => c.id !== "text-1");
    const eliteIndex1 = nonComment.findIndex(c => c.id === "elite-1");
    const eliteIndex2 = nonComment.findIndex(c => c.id === "elite-2");
    const firstNonElite = nonComment.findIndex(
      c => c.id !== "elite-1" && c.id !== "elite-2"
    );
    expect(eliteIndex1).toBeGreaterThanOrEqual(0);
    expect(eliteIndex2).toBeGreaterThanOrEqual(0);
    expect(eliteIndex1).toBeLessThan(firstNonElite);
    expect(eliteIndex2).toBeLessThan(firstNonElite);
  });

  it("preserves host section order when asked", () => {
    const strip = shuffleTipStrip(chars(["a", "b", "text-1", "c"]), [], {
      preserveHostOrder: true,
    });
    expect(strip.map(c => c.id)).toEqual(["text-1", "a", "b", "c"]);
  });
});
