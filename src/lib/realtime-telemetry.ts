import type { TipAnimationEvent } from "@/lib/animation-guard";

export type RealtimeSurface =
  | "event_room"
  | "screen_display"
  | "channel_client"
  | "content_client"
  | "tv_looper"
  | "explore_feed"
  | "explore_tv_schedule"
  | "payment_player"
  | "room_messages"
  | "global_tip_stream"
  | "tiplink"
  | "unknown";

export type RealtimeTelemetryEvent =
  | "tip_animation_received"
  | "tip_animation_accepted"
  | "tip_animation_rejected"
  | "tip_animation_filtered"
  | "validated_tip_dispatched"
  | "bundle_enqueue"
  | "subscription_bind"
  | "subscription_unbind";

export interface RealtimeTelemetryPayload {
  event: RealtimeTelemetryEvent;
  surface: RealtimeSurface;
  eventId?: string;
  bundleId?: string;
  seq?: number;
  serverTs?: number;
  playbackEndsAt?: number;
  ageMs?: number;
  reason?: string;
  characterCount?: number;
  rewardTurbo?: boolean;
  rewardGalaxy?: boolean;
  tabHidden?: boolean;
  ts: number;
}

const TELEMETRY_PREFIX = "[TipmannaRealtime]";

/** Structured JSON logs for cross-surface / Android TV correlation (grep-friendly). */
export function logRealtimeTelemetry(payload: RealtimeTelemetryPayload): void {
  if (typeof window === "undefined") return;
  try {
    const line = JSON.stringify(payload);
    if (process.env.NODE_ENV === "production") {
      console.info(TELEMETRY_PREFIX, line);
    } else {
      console.debug(TELEMETRY_PREFIX, line);
    }
  } catch {
    console.info(TELEMETRY_PREFIX, payload.event, payload.surface);
  }
}

export function telemetryFromTip(
  data: TipAnimationEvent,
  partial: Omit<RealtimeTelemetryPayload, "ts"> & { ts?: number }
): RealtimeTelemetryPayload {
  return {
    ts: partial.ts ?? Date.now(),
    eventId: data.eventId,
    bundleId: data.id,
    seq: data.seq,
    serverTs: data.serverTs,
    playbackEndsAt: data.playbackEndsAt,
    ageMs: Date.now() - data.serverTs,
    rewardTurbo: data.rewardTurbo,
    rewardGalaxy: data.rewardGalaxy,
    ...partial,
  };
}
