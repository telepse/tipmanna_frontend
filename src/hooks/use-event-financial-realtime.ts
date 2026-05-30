"use client";

import { useEffect, useState } from "react";
import { getPusherClient } from "@/lib/pusher";
import type { Channel } from "pusher-js";

const EVT_FIN_REFCOUNTS = new Map<string, number>();

const PUSHER_REFCOUNT_ENABLED =
  process.env.NEXT_PUBLIC_EXPLORE_PUSHER_REFCOUNT_ENABLED === "true";

function acquireEventFinancialChannel(eventId: string): Channel | null {
  const client = getPusherClient();
  if (!client) return null;

  try {
    if (!PUSHER_REFCOUNT_ENABLED) {
      return client.subscribe(`event-${eventId}`) ?? null;
    }

    const name = `event-${eventId}`;
    let channel: Channel | null = null;
    const prev = EVT_FIN_REFCOUNTS.get(eventId) ?? 0;

    if (prev === 0) {
      channel = client.subscribe(name);
    } else {
      channel = client.channel(name);
    }

    if (!channel) {
      console.error(
        "[Pusher] acquireEventFinancialChannel: missing channel after subscribe"
      );
      return null;
    }

    EVT_FIN_REFCOUNTS.set(eventId, prev + 1);
    return channel;
  } catch (e) {
    console.error("[Pusher] acquireEventFinancialChannel failed", e);
    return null;
  }
}

function releaseEventFinancialChannel(eventId: string): void {
  const client = getPusherClient();
  if (!client) return;

  if (!PUSHER_REFCOUNT_ENABLED) {
    try {
      client.unsubscribe(`event-${eventId}`);
    } catch {
      /* ignore */
    }
    return;
  }

  const prev = EVT_FIN_REFCOUNTS.get(eventId) ?? 0;
  const next = Math.max(0, prev - 1);
  const name = `event-${eventId}`;

  if (next <= 0) {
    EVT_FIN_REFCOUNTS.delete(eventId);
    try {
      client.unsubscribe(name);
    } catch (e) {
      console.error("[Pusher] releaseEventFinancialChannel", e);
    }
  } else {
    EVT_FIN_REFCOUNTS.set(eventId, next);
  }
}

export interface UseEventFinancialRealtimeInput {
  eventId: string;
  initialAmountRaised: number;
  initialNumOfTips: number;
  initialLatestTipAmount: number;
  initialSessionAmountToRaise?: number;
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
  enabled = true,
  includeOptionalEvents = true,
}: UseEventFinancialRealtimeInput): {
  amountRaised: number;
  numOfTips: number;
  latestTipAmount: number;
  sessionAmountToRaise: number | undefined;
} {
  const [amountRaised, setAmountRaised] = useState(initialAmountRaised);
  const [numOfTips, setNumOfTips] = useState(initialNumOfTips);
  const [latestTipAmount, setLatestTipAmount] = useState(
    initialLatestTipAmount
  );
  const [sessionAmountToRaise, setSessionAmountToRaise] = useState<
    number | undefined
  >(initialSessionAmountToRaise);

  /** When refcount mode is enabled, waits briefly so fast Explore swipes skip subscribe churn. */
  const [wiredEventId, setWiredEventId] = useState("");

  useEffect(() => {
    setAmountRaised(initialAmountRaised);
    setNumOfTips(initialNumOfTips);
    setLatestTipAmount(initialLatestTipAmount);
    setSessionAmountToRaise(initialSessionAmountToRaise);
  }, [
    eventId,
    initialAmountRaised,
    initialNumOfTips,
    initialLatestTipAmount,
    initialSessionAmountToRaise,
  ]);

  useEffect(() => {
    if (!enabled || !eventId) {
      setWiredEventId("");
      return;
    }
    if (!PUSHER_REFCOUNT_ENABLED) {
      setWiredEventId(eventId);
      return;
    }

    let cancelled = false;
    const tid = window.setTimeout(() => {
      if (!cancelled) setWiredEventId(eventId);
    }, 150);
    return () => {
      cancelled = true;
      window.clearTimeout(tid);
    };
  }, [eventId, enabled]);

  useEffect(() => {
    if (!enabled || !wiredEventId) return;

    const client = getPusherClient();
    if (!client) return;

    const channel = acquireEventFinancialChannel(wiredEventId);
    if (!channel) return;

    const onAmount = (data: { amountRaised?: number; numOfTips?: number }) => {
      if (typeof data.amountRaised === "number")
        setAmountRaised(data.amountRaised);
      if (typeof data.numOfTips === "number") setNumOfTips(data.numOfTips);
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
      releaseEventFinancialChannel(wiredEventId);
    };
  }, [wiredEventId, enabled, includeOptionalEvents]);

  return {
    amountRaised,
    numOfTips,
    latestTipAmount,
    sessionAmountToRaise,
  };
}
