import { describe, expect, it } from "vitest";

import { resolveLiveTipQuoteContext } from "@/hooks/use-tip-presentation";
import type { EnrichedRoomCharacter } from "@/lib/merge-tip-config";

const catalog: EnrichedRoomCharacter[] = [
  {
    id: "char-1",
    name: "Confetti",
    iconUrl: "/c.png",
    price: 5,
    styleName: "Confetti",
    tipItemId: "11111111-1111-1111-1111-111111111111",
    tipKind: "default",
    displayLabel: "Confetti",
  },
];

describe("resolveLiveTipQuoteContext", () => {
  const surfaces = [
    "tiplink",
    "content_client",
    "channel_client",
    "explore_feed",
    "tv_looper",
    "event_room",
    "community_room",
  ] as const;

  it.each(surfaces)(
    "builds quoteCtx for live tip layout on surface %s",
    surface => {
      const ctx = resolveLiveTipQuoteContext({
        eventId: "event-1",
        surface,
        configVersion: 3,
        textUnitPrice: 7.5,
        catalog,
      });
      expect(ctx).toEqual({
        eventId: "event-1",
        surface,
        configVersion: 3,
        textUnitPrice: 7.5,
        catalog,
      });
    }
  );
});
