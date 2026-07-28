import { describe, expect, it, vi, beforeEach } from "vitest";
import type { TipAnimationEvent } from "@/lib/animation-guard";
import type { RoomCharacter } from "@/types";
import { resolvePaymentCharactersForTip } from "@/lib/tip-animation-characters";

vi.mock("@/lib/payment-animation-trace", () => ({
  tracePaymentAnimation: vi.fn(),
  tracePaymentAnimationError: vi.fn(),
}));

function makeMap(entries: RoomCharacter[]): Map<string, RoomCharacter> {
  return new Map(entries.map(c => [c.name, c]));
}

function makeEvent(
  selectedTips: string[],
  resolvedTips?: TipAnimationEvent["resolvedTips"]
): TipAnimationEvent {
  return {
    id: "bundle-e5",
    seq: 1,
    eventId: "evt-1",
    serverTs: Date.now(),
    selectedTips,
    resolvedTips,
  };
}

describe("resolvePaymentCharactersForTip (Phase E5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves all server-valid characters", () => {
    const map = makeMap([
      {
        id: "1",
        name: "Heart",
        styleName: "Confetti",
        iconUrl: "/h.png",
        price: 1,
      },
    ]);

    const result = resolvePaymentCharactersForTip(
      makeEvent(
        ["Heart"],
        [
          {
            name: "Heart",
            styleName: "Confetti",
            iconUrl: "/h.png",
            characterId: "1",
          },
        ]
      ),
      map
    );

    expect(result.characters).toHaveLength(1);
    expect(result.summary.serverResolvedCount).toBe(1);
    expect(result.summary.unresolvedCount).toBe(0);
    expect(result.summary.entries[0]?.outcome).toBe("server_resolved");
  });

  it("keeps valid server entries when one server entry is invalid", () => {
    const map = makeMap([
      {
        id: "1",
        name: "A",
        styleName: "Burst",
        iconUrl: "/a.png",
        price: 1,
      },
      {
        id: "2",
        name: "B",
        styleName: "Confetti",
        iconUrl: "/b.png",
        price: 1,
      },
    ]);

    const result = resolvePaymentCharactersForTip(
      makeEvent(
        ["A", "B"],
        [
          {
            name: "A",
            styleName: "Confe",
            iconUrl: "/a.png",
            characterId: "1",
          },
          {
            name: "B",
            styleName: "Confetti",
            iconUrl: "/b.png",
            characterId: "2",
          },
        ]
      ),
      map
    );

    expect(result.characters.map(c => c.name)).toEqual(["A", "B"]);
    expect(result.summary.serverResolvedCount).toBe(1);
    expect(result.summary.localFallbackCount).toBe(1);
    expect(result.summary.entries[0]?.outcome).toBe("local_fallback");
    expect(result.summary.entries[1]?.outcome).toBe("server_resolved");
  });

  it("uses local fallback when server entry missing", () => {
    const map = makeMap([
      {
        id: "1",
        name: "Heart",
        styleName: "Burst",
        iconUrl: "/h.png",
        price: 1,
      },
    ]);

    const result = resolvePaymentCharactersForTip(makeEvent(["Heart"]), map);

    expect(result.summary.entries[0]?.outcome).toBe("local_fallback");
    expect(result.characters[0]?.styleName).toBe("Burst");
  });

  it("returns unresolved_character when neither server nor local resolves", () => {
    const result = resolvePaymentCharactersForTip(
      makeEvent(["Missing"], []),
      new Map()
    );

    expect(result.characters).toHaveLength(0);
    expect(result.summary.entries[0]?.outcome).toBe("unresolved_character");
    expect(result.summary.unresolvedCount).toBe(1);
  });

  it("allows Luxurious without icon via server resolution", () => {
    const map = makeMap([
      {
        id: "1",
        name: "Crown",
        styleName: "Luxurious",
        iconUrl: "",
        price: 1,
      },
    ]);

    const result = resolvePaymentCharactersForTip(
      makeEvent(
        ["Crown"],
        [
          {
            name: "Crown",
            styleName: "Luxurious",
            iconUrl: "",
            characterId: "1",
          },
        ]
      ),
      map
    );

    expect(result.summary.entries[0]?.outcome).toBe("server_resolved");
    expect(result.summary.missingIconCount).toBe(0);
  });

  it("reports missing_required_icon when icon required and unavailable", () => {
    const result = resolvePaymentCharactersForTip(
      makeEvent(
        ["Heart"],
        [
          {
            name: "Heart",
            styleName: "Burst",
            iconUrl: "",
            characterId: "1",
          },
        ]
      ),
      new Map()
    );

    expect(result.summary.entries[0]?.outcome).toBe("missing_required_icon");
    expect(result.summary.missingIconCount).toBe(1);
    expect(result.characters).toHaveLength(0);
  });

  it("resolves Comment via Add Comment local alias", () => {
    const map = makeMap([
      {
        id: "1",
        name: "Add Comment",
        styleName: "Confetti",
        iconUrl: "/c.png",
        price: 1,
      },
    ]);

    const result = resolvePaymentCharactersForTip(makeEvent(["Comment"]), map);

    expect(result.summary.entries[0]?.outcome).toBe("local_fallback");
    expect(result.characters[0]?.name).toBe("Add Comment");
  });

  it("preserves selectedTips order including duplicates", () => {
    const map = makeMap([
      {
        id: "1",
        name: "Heart",
        styleName: "Confetti",
        iconUrl: "/h.png",
        price: 1,
      },
    ]);

    const result = resolvePaymentCharactersForTip(
      makeEvent(["Heart", "Heart"]),
      map
    );

    expect(result.summary.entries.map(e => e.name)).toEqual(["Heart", "Heart"]);
    expect(result.summary.expectedCount).toBe(2);
  });
});
