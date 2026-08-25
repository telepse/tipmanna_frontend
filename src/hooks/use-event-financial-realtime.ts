"use client";

import { useEffect, useState } from "react";
import { subscribeChannel, unsubscribeChannel } from "@/lib/pusher";

const EXPLORE_PUSHER_DEBOUNCE_MS = 150;

export interface UseEventFinancialRealtimeInput {
  eventId: string;
  initialAmountRaised: number;
  initialNumOfTips: number;
  initialLatestTipAmount: number;
  initialSessionAmountToRaise?: number;
  /** When set, applies channelNumOfTips from Pusher only for this video. */
  channelId?: string | null;
  initialChannelNumOfTips?: number;
  enabled?: boolean;
  /** When false (e.g. TV strip), only bind event-amount-updated — fewer handlers on the channel. */
  includeOptionalEvents?: boolean;
}

/**
 * Single subscription to public `event-{eventId}` for fundraising + session counters.
 * Binds: event-amount-updated, latest-tip-updated, session-activated.
 */
export function useEventFinancialRealtime({
  eventId,
  initialAmountRaised,
  initialNumOfTips,
  initialLatestTipAmount,
  initialSessionAmountToRaise,
  channelId,
  initialChannelNumOfTips = 0,
  enabled = true,
  includeOptionalEvents = true,
}: UseEventFinancialRealtimeInput): {
  amountRaised: number;
  numOfTips: number;
  channelNumOfTips: number;
  latestTipAmount: number;
  sessionAmountToRaise: number | undefined;
} {
  const [amountRaised, setAmountRaised] = useState(initialAmountRaised);
  const [numOfTips, setNumOfTips] = useState(initialNumOfTips);
  const [channelNumOfTips, setChannelNumOfTips] = useState(
    initialChannelNumOfTips
  );
  const [latestTipAmount, setLatestTipAmount] = useState(
    initialLatestTipAmount
  );
  const [sessionAmountToRaise, setSessionAmountToRaise] = useState<
    number | undefined
  >(initialSessionAmountToRaise);

  /** Debounce wiring so fast Explore swipes skip subscribe churn. */
  const [wiredEventId, setWiredEventId] = useState("");

  useEffect(() => {
    setAmountRaised(initialAmountRaised);
    setNumOfTips(initialNumOfTips);
    setChannelNumOfTips(initialChannelNumOfTips);
    setLatestTipAmount(initialLatestTipAmount);
    setSessionAmountToRaise(initialSessionAmountToRaise);
  }, [
    eventId,
    initialAmountRaised,
    initialNumOfTips,
    initialChannelNumOfTips,
    initialLatestTipAmount,
    initialSessionAmountToRaise,
  ]);

  useEffect(() => {
    if (!enabled || !eventId) {
      setWiredEventId("");
      return;
    }

    let cancelled = false;
    const tid = window.setTimeout(() => {
      if (!cancelled) setWiredEventId(eventId);
    }, EXPLORE_PUSHER_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(tid);
    };
  }, [eventId, enabled]);

  useEffect(() => {
    if (!enabled || !wiredEventId) return;

    const channelName = `event-${wiredEventId}`;
    const channel = subscribeChannel(channelName);
    if (!channel) return;

    const scopedChannelId = channelId?.trim() || "";

    const onAmount = (data: {
      amountRaised?: number;
      numOfTips?: number;
      paymentContentId?: string;
      channelNumOfTips?: number;
    }) => {
      if (typeof data.amountRaised === "number")
        setAmountRaised(data.amountRaised);
      if (typeof data.numOfTips === "number") setNumOfTips(data.numOfTips);
      if (
        scopedChannelId &&
        data.paymentContentId === scopedChannelId &&
        typeof data.channelNumOfTips === "number"
      ) {
        setChannelNumOfTips(data.channelNumOfTips);
      }
    };

    const onLatest = (data: { latestTipAmount?: number }) => {
      if (typeof data.latestTipAmount === "number")
        setLatestTipAmount(data.latestTipAmount);
    };

    const onSession = (data: { amountToRaise?: number }) => {
      if (typeof data.amountToRaise === "number")
        setSessionAmountToRaise(data.amountToRaise);
    };

    channel.bind("event-amount-updated", onAmount);
    if (includeOptionalEvents) {
      channel.bind("latest-tip-updated", onLatest);
      channel.bind("session-activated", onSession);
    }

    return () => {
      channel.unbind("event-amount-updated", onAmount);
      if (includeOptionalEvents) {
        channel.unbind("latest-tip-updated", onLatest);
        channel.unbind("session-activated", onSession);
      }
      unsubscribeChannel(channelName);
    };
  }, [wiredEventId, enabled, includeOptionalEvents, channelId]);

  return {
    amountRaised,
    numOfTips,
    channelNumOfTips,
    latestTipAmount,
    sessionAmountToRaise,
  };
}
