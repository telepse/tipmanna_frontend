"use client";

import { useMemo } from "react";

import { useTipConfig } from "@/hooks/use-tip-config";
import {
  buildTipPresentation,
  type EnrichedRoomCharacter,
  type TipPresentation,
} from "@/lib/merge-tip-config";
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
  opts?: { quoteLock?: boolean; paymentSurface?: string }
): {
  strip: RoomCharacter[] | EnrichedRoomCharacter[];
  drawerSets: TipPresentation["drawerSets"] | null;
  quoteCtx: TipQuoteContext | null;
  textUnitPrice: number;
  sectionCtaLabel?: string;
  payLabel?: string;
} {
  const tipCfg = useTipConfig(eventId);
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
        drawerSets: null,
        quoteCtx: null,
        textUnitPrice: 5,
        sectionCtaLabel: undefined,
        payLabel: undefined,
      };
    }

    const p = buildTipPresentation(
      baseCharacters,
      tipCfg.config,
      tipCfg.version
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
      drawerSets: p.drawerSets,
      quoteCtx,
      textUnitPrice: p.textUnitPrice,
      sectionCtaLabel: p.ctaSectionLabel,
      payLabel: p.ctaPayLabel,
    };
  }, [baseCharacters, eventId, quoteLock, surface, tipCfg]);
}
