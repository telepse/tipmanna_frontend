"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import type { RoomCharacter } from "@/types";
import type { TipAnimationEvent } from "@/lib/animation-guard";
import { useAnimationQueue } from "@/hooks/use-animation-queue";
import { animLog } from "@/lib/animationDebug";
import { enqueuePaymentBundleForValidatedTip } from "@/lib/run-payment-bundle-animations";
import { tracePaymentAnimation } from "@/lib/payment-animation-trace";
import { buildPaymentPlaybackKeyForBundleCharacter } from "@/lib/payment-playback-key";

export interface UsePaymentAnimationPlayerOptions {
  /** Tips for this event are played; empty string skips playback. */
  eventId: string;
  characters: RoomCharacter[];
  enabled?: boolean;
  /** When set, payment overlays append here instead of document.body (e.g. TV scaled viewport). */
  animationMount?: RefObject<HTMLElement | null>;
  surface?: import("@/lib/realtime-telemetry").RealtimeSurface;
  /** Prepended to each playback key (e.g. Screen Display uses `screen-`). */
  playbackKeyPrefix?: string;
}

/**
 * Mirrors Screen Display payment animation behavior: listens for `validated-tip`,
 * dedupes per purchased character name, runs {@link wrapPaymentAnimation} per character, enqueues sequentially.
 */
export function usePaymentAnimationPlayer({
  eventId,
  characters,
  enabled = true,
  animationMount,
  surface = "payment_player",
  playbackKeyPrefix = "",
}: UsePaymentAnimationPlayerOptions): void {
  const eventIdRef = useRef(eventId);
  eventIdRef.current = eventId;

  const animationMountRef = useRef(animationMount);
  animationMountRef.current = animationMount;

  const queueKey = eventId || "__no-event__";
  const { enqueue } = useAnimationQueue({
    eventId: queueKey,
    enabled,
    surface,
  });

  const enqueueRef = useRef(enqueue);
  enqueueRef.current = enqueue;

  const characterMap = useMemo(() => {
    const m = new Map<string, RoomCharacter>();
    for (const c of characters) m.set(c.name, c);
    return m;
  }, [characters]);
  const characterMapRef = useRef(characterMap);
  characterMapRef.current = characterMap;

  const playbackKeyPrefixRef = useRef(playbackKeyPrefix);
  playbackKeyPrefixRef.current = playbackKeyPrefix;

  useEffect(() => {
    if (typeof window === "undefined" || !enabled) return;

    const handleValidatedTip = (e: Event) => {
      const data = (e as CustomEvent<TipAnimationEvent>).detail;
      const sid = eventIdRef.current.trim();
      const payloadEventId =
        data?.eventId != null ? String(data.eventId).trim() : "";
      if (!sid || !payloadEventId || payloadEventId !== sid) return;

      tracePaymentAnimation({
        stage: "validated_tip_listener_received",
        surface,
        eventId: data.eventId,
        bundleId: data.id,
        seq: data.seq,
      });

      animLog("[usePaymentAnimationPlayer]", {
        eventId: data.eventId,
        tips: data.selectedTips,
      });

      const prefix = playbackKeyPrefixRef.current;
      enqueuePaymentBundleForValidatedTip({
        data,
        characterMap: characterMapRef.current,
        buildDedupeKey: (name, characterIndex = 0) =>
          buildPaymentPlaybackKeyForBundleCharacter(
            data,
            characterIndex,
            name,
            prefix
          ),
        enqueue: enqueueRef.current,
        animationMount: animationMountRef.current?.current ?? undefined,
        surface,
        bundleRunContext: { deliverySource: "realtime" },
      });
    };

    window.addEventListener("validated-tip", handleValidatedTip);
    return () =>
      window.removeEventListener("validated-tip", handleValidatedTip);
  }, [enabled, surface]);
}
