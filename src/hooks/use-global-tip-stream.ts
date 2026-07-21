"use client";

import { useEffect, useRef } from "react";
import { subscribeChannel, unsubscribeChannel } from "@/lib/pusher";
import { createTipGuard, type TipAnimationEvent } from "@/lib/animation-guard";
import { animLog } from "@/lib/animationDebug";
import { logRealtimeTelemetry } from "@/lib/realtime-telemetry";
import { tracePaymentAnimation } from "@/lib/payment-animation-trace";
import type { Channel } from "pusher-js";

/**
 * Pusher channel `community-{id}-tv` for community TV schedule updates.
 */
export function acquireCommunityLiveTvChannel(
  communityId: string
): Channel | null {
  return subscribeChannel(`community-${communityId}-tv`);
}

export function releaseCommunityLiveTvChannel(communityId: string): void {
  unsubscribeChannel(`community-${communityId}-tv`);
}

/**
 * Share one Pusher subscription for channel `global-live-tv` when multiple
 * features on the same page bind different events (e.g. tip-animation vs live-tip).
 * Never throws; returns null if Pusher is unavailable.
 */
export function acquireGlobalLiveTvChannel(): Channel | null {
  return subscribeChannel("global-live-tv");
}

export function releaseGlobalLiveTvChannel(): void {
  unsubscribeChannel("global-live-tv");
}

export interface UseGlobalTipStreamOptions {
  /**
   * When set, only dispatches `validated-tip` if `data.eventId` matches.
   * Use on single-event surfaces (room, screen, channel, content).
   */
  eventId?: string;
  /** When false, does not subscribe or bind (default true). */
  enabled?: boolean;
  /** Structured telemetry surface tag (mirror renderer identity). */
  surface?: import("@/lib/realtime-telemetry").RealtimeSurface;
}

/**
 * Subscribes to `global-live-tv`, binds `tip-animation`, validates with
 * {@link createTipGuard}, and dispatches `validated-tip` on the window.
 * Does not render anything.
 */
export function useGlobalTipStream(
  options: UseGlobalTipStreamOptions = {}
): void {
  const { eventId, enabled = true, surface = "global_tip_stream" } = options;

  /** Keep filter hot without tearing down Pusher bind/unsubscribe on every swipe. */
  const eventIdRef = useRef(eventId);
  eventIdRef.current = eventId;

  useEffect(() => {
    if (typeof window === "undefined" || !enabled) return;

    const channel = acquireGlobalLiveTvChannel();
    if (!channel) return;

    const guard = createTipGuard({ surface });

    const handleTipAnimation = (data: TipAnimationEvent) => {
      tracePaymentAnimation({
        stage: "raw_tip_animation_received",
        surface,
        eventId: data.eventId,
        bundleId: data.id,
        seq: data.seq,
        serverTs: data.serverTs,
        selectedTips: data.selectedTips,
        channel: "global-live-tv",
        eventName: "tip-animation",
      });

      const raw = eventIdRef.current;
      const filter =
        raw !== undefined && String(raw).trim() !== ""
          ? String(raw).trim()
          : undefined;

      logRealtimeTelemetry({
        event: "tip_animation_received",
        surface,
        eventId: data.eventId,
        bundleId: data.id,
        seq: data.seq,
        serverTs: data.serverTs,
        playbackEndsAt: data.playbackEndsAt,
        ageMs: Date.now() - data.serverTs,
        tabHidden: document.hidden,
        ts: Date.now(),
      });

      if (filter !== undefined && String(data.eventId).trim() !== filter) {
        logRealtimeTelemetry({
          event: "tip_animation_filtered",
          surface,
          eventId: data.eventId,
          bundleId: data.id,
          reason: `eventId_mismatch:expected=${filter}`,
          ts: Date.now(),
        });
        tracePaymentAnimation({
          stage: "event_id_filter_rejected",
          surface,
          eventId: data.eventId,
          bundleId: data.id,
          seq: data.seq,
          rejectionReason: "wrong_event",
          result: "rejected",
        });
        return;
      }

      if (filter !== undefined) {
        tracePaymentAnimation({
          stage: "event_id_filter_accepted",
          surface,
          eventId: data.eventId,
          bundleId: data.id,
          seq: data.seq,
          result: "accepted",
        });
      }

      const accepted = guard.shouldAccept(data);
      const age = Date.now() - data.serverTs;
      animLog("[useGlobalTipStream]", {
        id: data.id,
        seq: data.seq,
        serverTs: data.serverTs,
        eventId: data.eventId,
        selectedTipsLen: data.selectedTips?.length,
        age,
        tabHidden: document.hidden,
        accepted,
      });
      if (!accepted) return;

      logRealtimeTelemetry({
        event: "validated_tip_dispatched",
        surface,
        eventId: data.eventId,
        bundleId: data.id,
        seq: data.seq,
        serverTs: data.serverTs,
        playbackEndsAt: data.playbackEndsAt,
        ageMs: age,
        ts: Date.now(),
      });

      tracePaymentAnimation({
        stage: "validated_tip_dispatched",
        surface,
        eventId: data.eventId,
        bundleId: data.id,
        seq: data.seq,
        serverTs: data.serverTs,
        selectedTips: data.selectedTips,
        result: "dispatched",
      });

      window.dispatchEvent(new CustomEvent("validated-tip", { detail: data }));
    };

    channel.bind("tip-animation", handleTipAnimation);
    tracePaymentAnimation({
      stage: "tip_handler_bound",
      surface,
      eventId: eventIdRef.current,
      channel: "global-live-tv",
      eventName: "tip-animation",
      handlerBound: true,
    });
    logRealtimeTelemetry({
      event: "subscription_bind",
      surface,
      eventId: eventIdRef.current,
      ts: Date.now(),
    });

    return () => {
      channel.unbind("tip-animation", handleTipAnimation);
      tracePaymentAnimation({
        stage: "tip_handler_unbound",
        surface,
        eventId: eventIdRef.current,
        channel: "global-live-tv",
        eventName: "tip-animation",
        handlerBound: false,
      });
      logRealtimeTelemetry({
        event: "subscription_unbind",
        surface,
        eventId: eventIdRef.current,
        ts: Date.now(),
      });
      releaseGlobalLiveTvChannel();
    };
  }, [enabled, surface]);
}
