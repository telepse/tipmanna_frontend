import type { PaymentSurface } from "../analytics-types";
import type { TvAnalyticsEventV1 } from "../tvAnalyticsSchema";

export type SdkPlaybackEventV2 = TvAnalyticsEventV1 & {
  eventUid: string;
  activationId?: string;
};

export type SdkBatchContext = {
  sessionId: string;
  surface: PaymentSurface;
  eventId?: string;
  videoChannelId?: string;
  communityId?: string;
  deviceCategory?: "mobile" | "desktop" | "unknown";
  visitorId?: string;
};

/** Tab queue item; optional beaconedAt for keep-until-ack TTL. */
export type SdkQueuedItem = SdkPlaybackEventV2 & {
  beaconedAt?: number;
};

export type V2IngestAckBody = {
  accepted: number;
  duplicates: string[];
  rejected: Array<{ index: number; reason: string }>;
  cardsPersisted?: number;
};

export type TransportAuth = {
  token?: string | null;
  visitorId?: string | null;
};

/** Default TTL for unacked beacon copies (duplicate UID safe on retry). */
export const BEACON_ACK_TTL_MS = 5 * 60 * 1000;
