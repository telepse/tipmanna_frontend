import { REALTIME_GUARD } from "@/lib/animationContract";
import {
  logRealtimeTelemetry,
  type RealtimeSurface,
} from "@/lib/realtime-telemetry";

/** Wire / transport max age; product “still live” uses `playbackEndsAt` on the payload. */
export const STALE_THRESHOLD_MS = REALTIME_GUARD.staleThresholdMs;

export interface ResolvedTipCharacter {
  name: string;
  iconUrl: string;
  styleName: string | null;
  characterId: string | null;
}

export interface TipAnimationEvent {
  /** Slim payloads use `eventId`, `selectedTips`, `serverTs`; backend may add `resolvedTips`. */
  id?: string;
  seq?: number;
  serverTs: number;
  /** Wall-clock end of the full multi-character payment bundle (ms since epoch). */
  playbackEndsAt?: number;
  eventId: string;
  selectedTips: string[];
  resolvedTips?: ResolvedTipCharacter[];
  amount?: number;
  sender?: string;
  /** Server-computed: ≥3 distinct animation styles (or implied by Galaxy). */
  rewardTurbo?: boolean;
  /** Server-computed: tip total ≥ £50 (pounds, same as Message.tip). */
  rewardGalaxy?: boolean;
}

export type TipGuardRejectReason = "stale" | "duplicate_seq" | "duplicate_ts";

export function createTipGuard(options?: { surface?: RealtimeSurface }) {
  const surface = options?.surface ?? "unknown";
  const lastSeqByEvent = new Map<string, number>();
  const lastServerTsByEvent = new Map<string, number>();

  return {
    shouldAccept(data: TipAnimationEvent): boolean {
      const ageMs = Date.now() - data.serverTs;
      if (ageMs > STALE_THRESHOLD_MS) {
        logRealtimeTelemetry({
          event: "tip_animation_rejected",
          surface,
          eventId: data.eventId,
          bundleId: data.id,
          seq: data.seq,
          serverTs: data.serverTs,
          playbackEndsAt: data.playbackEndsAt,
          ageMs,
          reason: "stale",
          ts: Date.now(),
        });
        return false;
      }

      if (typeof data.seq === "number") {
        const lastSeq = lastSeqByEvent.get(data.eventId) ?? 0;
        if (data.seq <= lastSeq) {
          logRealtimeTelemetry({
            event: "tip_animation_rejected",
            surface,
            eventId: data.eventId,
            bundleId: data.id,
            seq: data.seq,
            serverTs: data.serverTs,
            playbackEndsAt: data.playbackEndsAt,
            ageMs,
            reason: "duplicate_seq",
            ts: Date.now(),
          });
          return false;
        }
        lastSeqByEvent.set(data.eventId, data.seq);
      } else {
        const lastTs = lastServerTsByEvent.get(data.eventId) ?? 0;
        if (data.serverTs <= lastTs) {
          logRealtimeTelemetry({
            event: "tip_animation_rejected",
            surface,
            eventId: data.eventId,
            bundleId: data.id,
            serverTs: data.serverTs,
            playbackEndsAt: data.playbackEndsAt,
            ageMs,
            reason: "duplicate_ts",
            ts: Date.now(),
          });
          return false;
        }
        lastServerTsByEvent.set(data.eventId, data.serverTs);
      }

      logRealtimeTelemetry({
        event: "tip_animation_accepted",
        surface,
        eventId: data.eventId,
        bundleId: data.id,
        seq: data.seq,
        serverTs: data.serverTs,
        playbackEndsAt: data.playbackEndsAt,
        ageMs,
        rewardTurbo: data.rewardTurbo,
        rewardGalaxy: data.rewardGalaxy,
        ts: Date.now(),
      });
      return true;
    },
  };
}
