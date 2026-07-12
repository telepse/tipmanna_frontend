"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import type { RoomCharacter } from "@/types";
import type { TipAnimationEvent } from "@/lib/animation-guard";
import { useAnimationQueue } from "@/hooks/use-animation-queue";
import { animLog } from "@/lib/animationDebug";
import { enqueuePaymentBundleForValidatedTip } from "@/lib/run-payment-bundle-animations";

export interface UsePaymentAnimationPlayerOptions {
  /** Tips for this event are played; empty string skips playback. */
  eventId: string;
  characters: RoomCharacter[];
  enabled?: boolean;
  /** When set, payment overlays append here instead of document.body (e.g. TV scaled viewport). */
  animationMount?: RefObject<HTMLElement | null>;
  surface?: import("@/lib/realtime-telemetry").RealtimeSurface;
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
}: UsePaymentAnimationPlayerOptions): void {
  const eventIdRef = useRef(eventId);
  eventIdRef.current = eventId;

  const animationMountRef = useRef(animationMount);
  animationMountRef.current = animationMount;

  const queueKey = eventId || "__no-event__";
  const { enqueue } = useAnimationQueue({ eventId: queueKey, enabled });

  const enqueueRef = useRef(enqueue);
  enqueueRef.current = enqueue;

  const characterMap = useMemo(() => {
    const m = new Map<string, RoomCharacter>();
    for (const c of characters) m.set(c.name, c);
    return m;
  }, [characters]);
  const characterMapRef = useRef(characterMap);
  characterMapRef.current = characterMap;

  useEffect(() => {
    if (typeof window === "undefined" || !enabled) return;

    const handleValidatedTip = (e: Event) => {
      const data = (e as CustomEvent<TipAnimationEvent>).detail;
      const sid = eventIdRef.current.trim();
      const payloadEventId =
        data?.eventId != null ? String(data.eventId).trim() : "";
      if (!sid || !payloadEventId || payloadEventId !== sid) return;

      animLog("[usePaymentAnimationPlayer]", {
        eventId: data.eventId,
        tips: data.selectedTips,
      });

      const dedupeKeyBase = data.id ?? `${data.eventId}-${data.serverTs}`;
      enqueuePaymentBundleForValidatedTip({
        data,
        characterMap: characterMapRef.current,
        buildDedupeKey: name => `${dedupeKeyBase}-${name}`,
        enqueue: enqueueRef.current,
        animationMount: animationMountRef.current?.current ?? undefined,
        surface,
      });
    };

    window.addEventListener("validated-tip", handleValidatedTip);
    return () =>
      window.removeEventListener("validated-tip", handleValidatedTip);
  }, [enabled, surface]);
}
