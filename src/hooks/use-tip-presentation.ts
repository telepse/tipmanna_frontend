"use client";

import { useMemo } from "react";

import { useTipConfig } from "@/hooks/use-tip-config";
import {
  buildTipPresentation,
  type EnrichedRoomCharacter,
  type TipPresentation,
} from "@/lib/merge-tip-config";
import type { ActiveTipConfigResponse } from "@/lib/tip-config-types";
import type { RoomCharacter } from "@/types";

export type TipQuoteContext = {
  eventId: string;
  configVersion: number;
  textUnitPrice: number;
  catalog: EnrichedRoomCharacter[];
  surface: string;
};

export function useTipPresentation(
  eventId: string | undefined,
  baseCharacters: RoomCharacter[],
  opts?: {
    quoteLock?: boolean;
    paymentSurface?: string;
    initialTipConfig?: ActiveTipConfigResponse | null;
  }
): {
  strip: RoomCharacter[] | EnrichedRoomCharacter[];
  /** Full catalog (strip + drawer) for cart totals and price lookup. */
  catalog: RoomCharacter[] | EnrichedRoomCharacter[];
  drawerSets: TipPresentation["drawerSets"] | null;
  hasLiveLayout: boolean;
  quoteCtx: TipQuoteContext | null;
  textUnitPrice: number;
  sectionCtaLabel?: string;
  payLabel?: string;
  eliteCharacterIds?: string[];
} {
  const tipCfg = useTipConfig(eventId, { initial: opts?.initialTipConfig });
  const quoteLock = Boolean(opts?.quoteLock);
  const surface = opts?.paymentSurface ?? "event_room";

  return useMemo(() => {
    const legacyStrip = baseCharacters;
    if (
      !eventId ||
      tipCfg.status !== "ready" ||
      tipCfg.mode !== "live" ||
      !tipCfg.config
    ) {
      return {
        strip: legacyStrip,
        catalog: legacyStrip,
        drawerSets: null,
        hasLiveLayout: false,
        quoteCtx: null,
        textUnitPrice: 5,
        sectionCtaLabel: undefined,
        payLabel: undefined,
        eliteCharacterIds: undefined,
      };
    }

    const eliteStubs =
      tipCfg.mode === "live" && Array.isArray(tipCfg.eliteCharacters)
        ? tipCfg.eliteCharacters
        : [];
    const eliteRoomChars = eliteStubs.map(c => ({
      id: c.id,
      name: c.name,
      iconUrl: c.iconUrl,
      price: c.price,
      styleName: c.styleName?.trim() || "Confetti",
    }));
    const p = buildTipPresentation(
      baseCharacters,
      tipCfg.config,
      tipCfg.version,
      eliteRoomChars
    );
    const quoteCtx: TipQuoteContext | null =
      quoteLock && (surface === "event_room" || surface === "community_room")
        ? {
            eventId,
            configVersion: p.configVersion,
            textUnitPrice: p.textUnitPrice,
            catalog: p.allEnriched,
            surface,
          }
        : null;

    return {
      strip: p.sectionStrip,
      catalog: p.allEnriched,
      drawerSets: p.drawerSets,
      hasLiveLayout: true,
      quoteCtx,
      textUnitPrice: p.textUnitPrice,
      sectionCtaLabel: p.ctaSectionLabel,
      payLabel: p.ctaPayLabel,
      eliteCharacterIds: tipCfg.config.eliteCharacterIds,
    };
  }, [baseCharacters, eventId, quoteLock, surface, tipCfg]);
}
