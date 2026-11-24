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

/**
 * Live tip layout always yields a quote context for the actual payment surface.
 * Backend requires tipQuoteId on every surface when an event has live tip config.
 */
export function resolveLiveTipQuoteContext(params: {
  eventId: string;
  surface: string;
  configVersion: number;
  textUnitPrice: number;
  catalog: EnrichedRoomCharacter[];
}): TipQuoteContext {
  return {
    eventId: params.eventId,
    configVersion: params.configVersion,
    textUnitPrice: params.textUnitPrice,
    catalog: params.catalog,
    surface: params.surface,
  };
}

export function useTipPresentation(
  eventId: string | undefined,
  baseCharacters: RoomCharacter[],
  opts?: {
    /** @deprecated Unused for live configs; tip customization flag already gates live layout. Kept for call-site compatibility. */
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
    const quoteCtx = resolveLiveTipQuoteContext({
      eventId,
      surface,
      configVersion: p.configVersion,
      textUnitPrice: p.textUnitPrice,
      catalog: p.allEnriched,
    });

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
  }, [baseCharacters, eventId, surface, tipCfg]);
}
