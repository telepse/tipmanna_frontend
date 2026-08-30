/**
 * tv_analytics_v1 — batch POST body: { v: 1, sessionId, eventId?, surface?, deviceCategory?, events }
 */

import type { PaymentSurface, TvAnalyticsClipMode } from "./analytics-types";

export type TvAnalyticsEventV1 =
  | {
      event: "video_start";
      ts: number;
      itemId: string;
      channelId?: string;
      mode: TvAnalyticsClipMode;
      scheduleIndex: number;
    }
  | {
      event: "video_end";
      ts: number;
      itemId: string;
      channelId?: string;
      watchDurationSec: number;
      endReason: "ended" | "interrupted" | "slot_change" | "unknown";
      mode: TvAnalyticsClipMode;
    }
  | {
      event: "watch_duration";
      ts: number;
      itemId: string;
      channelId?: string;
      watchedSec: number;
      mode: TvAnalyticsClipMode;
    }
  | {
      event: "mode_change";
      ts: number;
      from: TvAnalyticsClipMode;
      to: TvAnalyticsClipMode;
      reason: string | null;
    }
  | {
      event: "user_interaction";
      ts: number;
      kind: "pause" | "seek" | "click" | "play";
      detail: string | null;
    }
  | {
      event: "share_click";
      ts: number;
      channelId?: string;
    }
  | {
      event: "save_click";
      ts: number;
      channelId?: string;
    }
  | {
      event: "video_encounter";
      ts: number;
      itemId: string;
      channelId?: string;
      videoDurationSec?: number;
      mode?: TvAnalyticsClipMode;
      scheduleIndex?: number;
    }
  | {
      event: "video_complete";
      ts: number;
      itemId?: string;
      channelId?: string;
      mode?: TvAnalyticsClipMode;
    }
  | {
      event: "comment_submit";
      ts: number;
      channelId?: string;
      transactionId?: string;
    }
  | {
      event: "card_impression";
      ts: number;
      cardId: string;
      cardSessionId?: string;
      hostSurfaceChannelId?: string;
      videoChannelId?: string;
    }
  | {
      event: "card_mini_expand";
      ts: number;
      cardId: string;
      cardSessionId?: string;
      hostSurfaceChannelId?: string;
      videoChannelId?: string;
    }
  | {
      event: "card_max_expand";
      ts: number;
      cardId: string;
      cardSessionId?: string;
      hostSurfaceChannelId?: string;
      videoChannelId?: string;
    }
  | {
      event: "overlay_close";
      ts: number;
      cardId: string;
      cardSessionId?: string;
      openedAtMs?: number;
      durationMs?: number;
      hostSurfaceChannelId?: string;
      videoChannelId?: string;
    };

export type TvAnalyticsBatchBodyV1 = {
  v: 1;
  sessionId: string;
  eventId?: string;
  surface?: PaymentSurface;
  deviceCategory?: import("./analytics-types").DeviceCategory;
  visitorId?: string;
  videoChannelId?: string;
  communityId?: string;
  events: TvAnalyticsEventV1[];
};
