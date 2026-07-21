import type { TipAnimationEvent } from "@/lib/animation-guard";
import type { RoomCharacter } from "@/types";
import {
  isKnownAnimationStyleName,
  type StyleCharacter,
} from "@/lib/animation-style-registry";
import { tracePaymentAnimation } from "@/lib/payment-animation-trace";

function traceLocalMapResolution(
  data: TipAnimationEvent,
  characterMap: Map<string, RoomCharacter>
): StyleCharacter[] {
  tracePaymentAnimation({
    stage: "local_map_fallback_started",
    eventId: data.eventId,
    bundleId: data.id,
    seq: data.seq,
  });

  const result = (data.selectedTips || [])
    .map(name => {
      const local = characterMap.get(name);
      if (local) {
        tracePaymentAnimation({
          stage: "local_character_matched",
          eventId: data.eventId,
          bundleId: data.id,
          characterName: name,
          localMapLookupName: name,
          localStyleName: local.styleName,
          styleName: local.styleName,
          iconPresent: Boolean(local.iconUrl?.trim()),
          chosenSource: "local",
        });
        return {
          name: local.name,
          iconUrl: local.iconUrl,
          styleName: local.styleName,
        };
      }
      tracePaymentAnimation({
        stage: "local_character_unresolved",
        eventId: data.eventId,
        bundleId: data.id,
        characterName: name,
        localMapLookupName: name,
        chosenSource: "unresolved",
      });
      return undefined;
    })
    .filter((c): c is StyleCharacter => Boolean(c));

  traceResolutionOutcome(data, result, "local_map");
  return result;
}

function traceResolutionOutcome(
  data: TipAnimationEvent,
  result: StyleCharacter[],
  source: string
): void {
  const expected = data.selectedTips?.length ?? 0;
  if (!result.length) {
    tracePaymentAnimation({
      stage: "character_resolution_empty",
      eventId: data.eventId,
      bundleId: data.id,
      result: source,
    });
  } else if (result.length !== expected) {
    tracePaymentAnimation({
      stage: "character_resolution_partial",
      eventId: data.eventId,
      bundleId: data.id,
      result: source,
      taskCount: result.length,
    });
  } else {
    tracePaymentAnimation({
      stage: "character_resolution_completed",
      eventId: data.eventId,
      bundleId: data.id,
      result: source,
      taskCount: result.length,
    });
  }
}

/**
 * Prefer server `resolvedTips`; fall back to event character map (same as pre-enrichment behavior).
 */
export function resolveStyleCharactersForTip(
  data: TipAnimationEvent,
  characterMap: Map<string, RoomCharacter>
): StyleCharacter[] {
  tracePaymentAnimation({
    stage: "character_resolution_started",
    eventId: data.eventId,
    bundleId: data.id,
    seq: data.seq,
    selectedTips: data.selectedTips,
  });

  const fromMap = (): StyleCharacter[] =>
    traceLocalMapResolution(data, characterMap);

  if (!data.resolvedTips?.length) return fromMap();

  const fromResolved: StyleCharacter[] = [];
  for (const r of data.resolvedTips) {
    if (!r.styleName || !isKnownAnimationStyleName(r.styleName)) {
      tracePaymentAnimation({
        stage: "resolved_tips_rejected_unknown_style",
        eventId: data.eventId,
        bundleId: data.id,
        characterName: r.name,
        serverStyleName: r.styleName,
        styleName: r.styleName ?? undefined,
      });
      return fromMap();
    }
    const iconUrl = r.iconUrl || characterMap.get(r.name)?.iconUrl || "";
    if (!iconUrl && r.styleName !== "Confetti") {
      tracePaymentAnimation({
        stage: "resolved_tips_rejected_missing_icon",
        eventId: data.eventId,
        bundleId: data.id,
        characterName: r.name,
        serverStyleName: r.styleName,
        styleName: r.styleName,
        iconPresent: false,
      });
      return fromMap();
    }
    tracePaymentAnimation({
      stage: "resolved_tips_path_selected",
      eventId: data.eventId,
      bundleId: data.id,
      characterName: r.name,
      serverStyleName: r.styleName,
      styleName: r.styleName,
      iconPresent: Boolean(iconUrl?.trim()),
      chosenSource: "server",
    });
    fromResolved.push({
      name: r.name,
      iconUrl,
      styleName: r.styleName,
    });
  }

  if (fromResolved.length !== (data.selectedTips?.length ?? 0)) {
    tracePaymentAnimation({
      stage: "resolved_tips_rejected_length_mismatch",
      eventId: data.eventId,
      bundleId: data.id,
      taskCount: fromResolved.length,
    });
    return fromMap();
  }

  traceResolutionOutcome(data, fromResolved, "server_resolved");
  return fromResolved;
}
