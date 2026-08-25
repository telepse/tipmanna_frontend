import type { TipAnimationEvent } from "@/lib/animation-guard";

/** Screen Display uses an independent prefix (`screen-`). */
export const SCREEN_DISPLAY_PLAYBACK_PREFIX = "screen-";

/**
 * Central payment playback key builder.
 * Legacy: `<prefix><bundleId>-<characterName>`
 * Canonical: `<prefix><bundleId>-<occurrenceIndex>-<characterName>`
 */
export function buildPaymentPlaybackKey(options: {
  prefix?: string;
  bundleId: string;
  characterName: string;
  occurrenceIndex?: number;
}): string {
  const prefix = options.prefix ?? "";
  const base = `${prefix}${options.bundleId}-`;
  if (typeof options.occurrenceIndex === "number") {
    return `${base}${options.occurrenceIndex}-${options.characterName}`;
  }
  return `${base}${options.characterName}`;
}

export function hasOccurrenceIdentity(
  resolvedTips?: Array<{ occurrenceIndex?: number }> | undefined
): boolean {
  return Boolean(
    resolvedTips?.some(r => typeof r.occurrenceIndex === "number")
  );
}

export function occurrenceIndexForBundleCharacter(
  data: TipAnimationEvent,
  characterIndex: number
): number | undefined {
  const entry = data.resolvedTips?.[characterIndex];
  if (entry && typeof entry.occurrenceIndex === "number") {
    return entry.occurrenceIndex;
  }
  if (hasOccurrenceIdentity(data.resolvedTips)) {
    return characterIndex;
  }
  return undefined;
}

export function buildPaymentPlaybackKeyForBundleCharacter(
  data: TipAnimationEvent,
  characterIndex: number,
  characterName: string,
  prefix = ""
): string {
  const bundleId = data.id ?? `${data.eventId}-${data.serverTs}`;
  return buildPaymentPlaybackKey({
    prefix,
    bundleId,
    characterName,
    occurrenceIndex: occurrenceIndexForBundleCharacter(data, characterIndex),
  });
}

/** Shared alias namespace for payer-local fallback vs realtime/recovery dedupe. */
export function buildTransactionAliasPlaybackKey(options: {
  prefix?: string;
  transactionId: string;
  characterName: string;
  occurrenceIndex?: number;
}): string {
  const txId = options.transactionId.trim();
  return buildPaymentPlaybackKey({
    prefix: options.prefix ?? "",
    bundleId: `tx:${txId}`,
    characterName: options.characterName,
    occurrenceIndex: options.occurrenceIndex,
  });
}
