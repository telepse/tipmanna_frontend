import type {
  TipAnimationEvent,
  ResolvedTipCharacter,
} from "@/lib/animation-guard";
import type { RoomCharacter } from "@/types";
import type { StyleCharacter } from "@/lib/animation-style-registry";
import { tracePaymentAnimation } from "@/lib/payment-animation-trace";
import {
  buildRunnableCharacter,
  countResolutionSummary,
  lookupLocalRoomCharacter,
  resolveCharacterIconUrl,
  styleRequiresCharacterIcon,
  type CharacterResolutionEntry,
  type CharacterResolutionOutcome,
  type PaymentBundleResolutionSummary,
} from "@/lib/payment-character-resolution";
import { isKnownAnimationStyleName } from "@/lib/animation-style-registry";

function indexServerEntriesByName(
  resolvedTips: ResolvedTipCharacter[] | undefined
): Map<string, ResolvedTipCharacter[]> {
  const byName = new Map<string, ResolvedTipCharacter[]>();
  for (const entry of resolvedTips ?? []) {
    const list = byName.get(entry.name) ?? [];
    list.push(entry);
    byName.set(entry.name, list);
  }
  return byName;
}

function takeServerEntry(
  byName: Map<string, ResolvedTipCharacter[]>,
  name: string
): ResolvedTipCharacter | undefined {
  const list = byName.get(name);
  if (!list?.length) return undefined;
  return list.shift();
}

function resolveFromLocal(
  data: TipAnimationEvent,
  name: string,
  characterMap: Map<string, RoomCharacter>
): CharacterResolutionEntry | null {
  const local = lookupLocalRoomCharacter(name, characterMap);
  if (!local?.styleName) {
    tracePaymentAnimation({
      stage: "local_character_unresolved",
      eventId: data.eventId,
      bundleId: data.id,
      characterName: name,
      localMapLookupName: name,
      chosenSource: "unresolved",
    });
    return null;
  }

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

  const character: StyleCharacter = {
    name: local.name,
    iconUrl: local.iconUrl,
    styleName: local.styleName,
  };

  return {
    name,
    outcome: "local_fallback",
    styleName: local.styleName,
    iconUrl: local.iconUrl,
    character,
  };
}

function finalizeResolutionEntry(
  data: TipAnimationEvent,
  name: string,
  outcome: CharacterResolutionOutcome,
  styleName: string | null,
  iconUrl: string,
  character?: StyleCharacter
): CharacterResolutionEntry {
  if (outcome === "server_resolved") {
    tracePaymentAnimation({
      stage: "resolved_tips_path_selected",
      eventId: data.eventId,
      bundleId: data.id,
      characterName: name,
      serverStyleName: styleName ?? undefined,
      styleName: styleName ?? undefined,
      iconPresent: Boolean(iconUrl?.trim()),
      chosenSource: "server",
    });
  }

  return {
    name,
    outcome,
    styleName,
    iconUrl,
    character,
  };
}

function resolveOneSelectedCharacter(
  data: TipAnimationEvent,
  name: string,
  characterMap: Map<string, RoomCharacter>,
  serverByName: Map<string, ResolvedTipCharacter[]>
): CharacterResolutionEntry {
  const serverEntry = takeServerEntry(serverByName, name);

  if (serverEntry) {
    const styleName = serverEntry.styleName;
    if (!styleName || !isKnownAnimationStyleName(styleName)) {
      tracePaymentAnimation({
        stage: "resolved_tips_rejected_unknown_style",
        eventId: data.eventId,
        bundleId: data.id,
        characterName: name,
        serverStyleName: styleName,
        styleName: styleName ?? undefined,
      });
      const local = resolveFromLocal(data, name, characterMap);
      if (local) return local;
      return finalizeResolutionEntry(
        data,
        name,
        "invalid_style",
        styleName,
        serverEntry.iconUrl ?? ""
      );
    }

    const iconUrl = resolveCharacterIconUrl(
      name,
      styleName,
      serverEntry.iconUrl,
      characterMap
    );

    if (styleRequiresCharacterIcon(styleName) && !iconUrl) {
      tracePaymentAnimation({
        stage: "resolved_tips_rejected_missing_icon",
        eventId: data.eventId,
        bundleId: data.id,
        characterName: name,
        serverStyleName: styleName,
        styleName,
        iconPresent: false,
      });
      const local = resolveFromLocal(data, name, characterMap);
      if (local) return local;
      return finalizeResolutionEntry(
        data,
        name,
        "missing_required_icon",
        styleName,
        iconUrl
      );
    }

    const character: StyleCharacter = {
      name: serverEntry.name,
      iconUrl,
      styleName,
    };

    return finalizeResolutionEntry(
      data,
      name,
      "server_resolved",
      styleName,
      iconUrl,
      character
    );
  }

  const local = resolveFromLocal(data, name, characterMap);
  if (local) return local;

  tracePaymentAnimation({
    stage: "local_character_unresolved",
    eventId: data.eventId,
    bundleId: data.id,
    characterName: name,
    localMapLookupName: name,
    chosenSource: "unresolved",
  });

  return finalizeResolutionEntry(data, name, "unresolved_character", null, "");
}

export interface PaymentCharacterResolutionResult {
  characters: StyleCharacter[];
  summary: PaymentBundleResolutionSummary;
}

export function resolvePaymentCharactersForTip(
  data: TipAnimationEvent,
  characterMap: Map<string, RoomCharacter>
): PaymentCharacterResolutionResult {
  tracePaymentAnimation({
    stage: "character_resolution_started",
    eventId: data.eventId,
    bundleId: data.id,
    seq: data.seq,
    selectedTips: data.selectedTips,
  });

  const selectedTips = data.selectedTips ?? [];
  const serverByName = indexServerEntriesByName(data.resolvedTips);
  const entries: CharacterResolutionEntry[] = selectedTips.map(name =>
    resolveOneSelectedCharacter(data, name, characterMap, serverByName)
  );

  const characters = entries
    .map(buildRunnableCharacter)
    .filter((c): c is StyleCharacter => Boolean(c));

  const partialCounts = countResolutionSummary(entries);
  const summary: PaymentBundleResolutionSummary = {
    expectedCount: selectedTips.length,
    ...partialCounts,
    runnableCount: characters.length,
    rejectedCount: 0,
    entries,
  };

  if (!characters.length) {
    tracePaymentAnimation({
      stage: "character_resolution_empty",
      eventId: data.eventId,
      bundleId: data.id,
      expectedCount: summary.expectedCount,
      unresolvedCount: summary.unresolvedCount,
      missingIconCount: summary.missingIconCount,
      result: "empty",
    });
  } else if (characters.length !== selectedTips.length) {
    tracePaymentAnimation({
      stage: "character_resolution_partial",
      eventId: data.eventId,
      bundleId: data.id,
      expectedCount: summary.expectedCount,
      runnableCount: summary.runnableCount,
      unresolvedCount: summary.unresolvedCount,
      missingIconCount: summary.missingIconCount,
      serverResolvedCount: summary.serverResolvedCount,
      localFallbackCount: summary.localFallbackCount,
      result: "partial",
    });
  } else {
    tracePaymentAnimation({
      stage: "character_resolution_completed",
      eventId: data.eventId,
      bundleId: data.id,
      expectedCount: summary.expectedCount,
      runnableCount: summary.runnableCount,
      serverResolvedCount: summary.serverResolvedCount,
      localFallbackCount: summary.localFallbackCount,
      result: "completed",
    });
  }

  tracePaymentAnimation({
    stage: "payment_bundle_resolution_summary",
    eventId: data.eventId,
    bundleId: data.id,
    seq: data.seq,
    expectedCount: summary.expectedCount,
    serverResolvedCount: summary.serverResolvedCount,
    localFallbackCount: summary.localFallbackCount,
    runnableCount: summary.runnableCount,
    rejectedCount: summary.rejectedCount,
    unresolvedCount: summary.unresolvedCount,
    missingIconCount: summary.missingIconCount,
  });

  return { characters, summary };
}

/**
 * Backward-compatible helper returning runnable characters only.
 */
export function resolveStyleCharactersForTip(
  data: TipAnimationEvent,
  characterMap: Map<string, RoomCharacter>
): StyleCharacter[] {
  if (!data.resolvedTips?.length) {
    tracePaymentAnimation({
      stage: "local_map_fallback_started",
      eventId: data.eventId,
      bundleId: data.id,
      seq: data.seq,
    });
  }

  return resolvePaymentCharactersForTip(data, characterMap).characters;
}
