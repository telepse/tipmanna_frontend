"use client";

import { useEventFinancialRealtime } from "./use-event-financial-realtime";

export interface UseEventRoomRealtimeInput {
  eventId: string;
  initialAmountRaised: number;
  initialNumOfTips: number;
  /** Current video channel id for per-video tip counter updates. */
  channelId?: string | null;
  initialChannelNumOfTips?: number;
  enabled?: boolean;
}

/**
 * Subscribes to public `event-{eventId}` for amount + tip count only (TV / channel / content surfaces).
 */
export function useEventRoomRealtime({
  eventId,
  initialAmountRaised,
  initialNumOfTips,
  channelId,
  initialChannelNumOfTips = 0,
  enabled = true,
}: UseEventRoomRealtimeInput): {
  amountRaised: number;
  numOfTips: number;
  channelNumOfTips: number;
} {
  const { amountRaised, numOfTips, channelNumOfTips } =
    useEventFinancialRealtime({
      eventId,
      enabled,
      initialAmountRaised,
      initialNumOfTips,
      initialLatestTipAmount: 0,
      initialSessionAmountToRaise: undefined,
      channelId,
      initialChannelNumOfTips,
      includeOptionalEvents: false,
    });

  return { amountRaised, numOfTips, channelNumOfTips };
}
