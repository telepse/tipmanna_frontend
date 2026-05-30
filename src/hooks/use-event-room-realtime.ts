"use client";

import { useEventFinancialRealtime } from "./use-event-financial-realtime";

export interface UseEventRoomRealtimeInput {
  eventId: string;
  initialAmountRaised: number;
  initialNumOfTips: number;
  enabled?: boolean;
}

/**
 * Subscribes to public `event-{eventId}` for amount + tip count only (TV / channel / content surfaces).
 */
export function useEventRoomRealtime({
  eventId,
  initialAmountRaised,
  initialNumOfTips,
  enabled = true,
}: UseEventRoomRealtimeInput): {
  amountRaised: number;
  numOfTips: number;
} {
  const { amountRaised, numOfTips } = useEventFinancialRealtime({
    eventId,
    enabled,
    initialAmountRaised,
    initialNumOfTips,
    initialLatestTipAmount: 0,
    initialSessionAmountToRaise: undefined,
    includeOptionalEvents: false,
  });

  return { amountRaised, numOfTips };
}
