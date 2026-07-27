import type { StyleCharacter } from "@/lib/animation-style-registry";
import { isKnownAnimationStyleName } from "@/lib/animation-style-registry";
import { tracePaymentAnimation } from "@/lib/payment-animation-trace";

export type PaymentCharacterStyleFailureReason = "unknown_style";

export interface PaymentCharacterStyleRejection {
  reason: PaymentCharacterStyleFailureReason;
  characterName: string;
  styleName: string;
  playbackKey: string;
  eventId?: string;
  bundleId?: string;
  seq?: number;
  surface?: string;
}

export interface PaymentCharacterStylePreflightContext {
  eventId?: string;
  bundleId?: string;
  seq?: number;
  surface?: string;
  buildPlaybackKey: (characterName: string) => string;
}

export interface PaymentCharacterStylePreflightOutcome {
  accepted: StyleCharacter[];
  rejections: PaymentCharacterStyleRejection[];
}

/** Exact, case-sensitive validation against canonical registry keys. */
export function validatePaymentCharacterStyle(
  character: StyleCharacter,
  context: PaymentCharacterStylePreflightContext
): { accepted: true } | { accepted: false; rejection: PaymentCharacterStyleRejection } {
  const playbackKey = context.buildPlaybackKey(character.name);
  const baseMeta = {
    surface: context.surface,
    eventId: context.eventId,
    bundleId: context.bundleId,
    seq: context.seq,
    characterName: character.name,
    styleName: character.styleName,
    playbackKey,
  };

  tracePaymentAnimation({
    stage: "payment_character_style_preflight_started",
    ...baseMeta,
  });

  if (!isKnownAnimationStyleName(character.styleName)) {
    const rejection: PaymentCharacterStyleRejection = {
      reason: "unknown_style",
      characterName: character.name,
      styleName: character.styleName,
      playbackKey,
      eventId: context.eventId,
      bundleId: context.bundleId,
      seq: context.seq,
      surface: context.surface,
    };
    tracePaymentAnimation({
      stage: "payment_character_rejected_unknown_style",
      ...baseMeta,
      reason: "unknown_style",
      playbackKeyState: "unseen",
      result: "rejected",
    });
    return { accepted: false, rejection };
  }

  tracePaymentAnimation({
    stage: "payment_character_style_preflight_accepted",
    ...baseMeta,
    result: "accepted",
  });
  return { accepted: true };
}

export function preflightPaymentCharacterStyles(
  characters: StyleCharacter[],
  context: PaymentCharacterStylePreflightContext
): PaymentCharacterStylePreflightOutcome {
  const accepted: StyleCharacter[] = [];
  const rejections: PaymentCharacterStyleRejection[] = [];

  for (const character of characters) {
    const outcome = validatePaymentCharacterStyle(character, context);
    if (outcome.accepted) {
      accepted.push(character);
    } else {
      rejections.push(outcome.rejection);
    }
  }

  tracePaymentAnimation({
    stage: "payment_bundle_style_preflight_completed",
    surface: context.surface,
    eventId: context.eventId,
    bundleId: context.bundleId,
    seq: context.seq,
    taskCount: accepted.length,
    rejectedCount: rejections.length,
    runnableCount: accepted.length,
    result: rejections.length > 0 ? "partial_or_rejected" : "all_accepted",
  });

  if (accepted.length === 0 && rejections.length > 0) {
    tracePaymentAnimation({
      stage: "payment_bundle_no_runnable_characters",
      surface: context.surface,
      eventId: context.eventId,
      bundleId: context.bundleId,
      seq: context.seq,
      rejectedCount: rejections.length,
      result: "no_runnable_characters",
    });
  }

  return { accepted, rejections };
}
