"use client";

import { useEffect, useRef } from "react";
import { getPusherClient } from "@/lib/pusher";
import { createTipGuard, type TipAnimationEvent } from "@/lib/animation-guard";
import { animLog } from "@/lib/animationDebug";
import { logRealtimeTelemetry } from "@/lib/realtime-telemetry";
import type { Channel } from "pusher-js";

let globalLiveTvRefCount = 0;

const communityLiveTvRefCounts = new Map<string, number>();

/**
 * Pusher channel `community-{id}-tv` for community TV schedule updates.
 */
export function acquireCommunityLiveTvChannel(
  communityId: string
): Channel | null {
  const client = getPusherClient();
  if (!client) {
    console.error("[Pusher] acquireCommunityLiveTvChannel: client unavailable");
    return null;
  }
  const name = `community-${communityId}-tv`;
  try {
    let channel: Channel | null = null;
    const prev = communityLiveTvRefCounts.get(name) ?? 0;
    if (prev === 0) {
      channel = client.subscribe(name);
    } else {
      channel = client.channel(name);
    }
    if (!channel) {
      console.error(
        "[Pusher] acquireCommunityLiveTvChannel: channel missing after subscribe"
      );
      return null;
    }
    communityLiveTvRefCounts.set(name, prev + 1);
    return channel;
  } catch (e) {
    console.error("[Pusher] acquireCommunityLiveTvChannel failed", e);
    return null;
  }
}

export function releaseCommunityLiveTvChannel(communityId: string): void {
  const name = `community-${communityId}-tv`;
  const prev = communityLiveTvRefCounts.get(name) ?? 0;
  const next = Math.max(0, prev - 1);
  if (next === 0) {
    communityLiveTvRefCounts.delete(name);
    const client = getPusherClient();
    if (!client) return;
    try {
      client.unsubscribe(name);
    } catch (e) {
      console.error("[Pusher] releaseCommunityLiveTvChannel", e);
    }
  } else {
    communityLiveTvRefCounts.set(name, next);
  }
}

/**
 * Share one Pusher subscription for channel `global-live-tv` when multiple
 * features on the same page bind different events (e.g. tip-animation vs live-tip).
 * Never throws; returns null if Pusher is unavailable.
 */
export function acquireGlobalLiveTvChannel(): Channel | null {
  const client = getPusherClient();
  if (!client) {
    console.error("[Pusher] acquireGlobalLiveTvChannel: client unavailable");
    return null;
  }

  try {
    let channel: Channel | null = null;
    if (globalLiveTvRefCount === 0) {
      channel = client.subscribe("global-live-tv");
    } else {
      channel = client.channel("global-live-tv");
    }

    if (!channel) {
      console.error(
        "[Pusher] acquireGlobalLiveTvChannel: channel missing after subscribe"
      );
      return null;
    }

    globalLiveTvRefCount++;
    return channel;
  } catch (e) {
    console.error("[Pusher] acquireGlobalLiveTvChannel failed", e);
    return null;
  }
}

export function releaseGlobalLiveTvChannel(): void {
  globalLiveTvRefCount = Math.max(0, globalLiveTvRefCount - 1);
  if (globalLiveTvRefCount === 0) {
    const client = getPusherClient();
    if (!client) return;
    try {
      client.unsubscribe("global-live-tv");
    } catch (e) {
      console.error("[Pusher] releaseGlobalLiveTvChannel", e);
    }
  }
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
        return;
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

      window.dispatchEvent(new CustomEvent("validated-tip", { detail: data }));
    };

    channel.bind("tip-animation", handleTipAnimation);
    logRealtimeTelemetry({
      event: "subscription_bind",
      surface,
      eventId: eventIdRef.current,
      ts: Date.now(),
    });

    return () => {
      channel.unbind("tip-animation", handleTipAnimation);
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
