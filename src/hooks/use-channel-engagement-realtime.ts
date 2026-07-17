"use client";

import { useEffect, useState } from "react";
import { subscribeChannel, unsubscribeChannel } from "@/lib/pusher";

export type ChannelEngagementMetrics = {
  views: number;
  encounters: number;
  completes: number;
  saves: number;
  shares: number;
  comments: number;
};

const DEBOUNCE_MS = 150;

export function useChannelEngagementRealtime(opts: {
  channelId: string | null | undefined;
  initial: ChannelEngagementMetrics | null;
  enabled?: boolean;
}): ChannelEngagementMetrics | null {
  const { channelId, initial, enabled = true } = opts;
  const [metrics, setMetrics] = useState<ChannelEngagementMetrics | null>(
    initial
  );
  const [wiredId, setWiredId] = useState("");

  useEffect(() => {
    setMetrics(initial);
  }, [channelId, initial]);

  useEffect(() => {
    if (!enabled || !channelId) {
      setWiredId("");
      return;
    }
    let cancelled = false;
    const tid = window.setTimeout(() => {
      if (!cancelled) setWiredId(channelId);
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(tid);
    };
  }, [channelId, enabled]);

  useEffect(() => {
    if (!enabled || !wiredId) return;
    const ch = `channel-${wiredId}`;
    const channel = subscribeChannel(ch);
    if (!channel) return;

    const onUpdate = (payload: {
      snapshot?: ChannelEngagementMetrics;
      saves?: number;
      shares?: number;
      comments?: number;
      encounters?: number;
      views?: number;
    }) => {
      if (payload.snapshot) {
        setMetrics(payload.snapshot);
        return;
      }
      setMetrics(prev => {
        if (!prev) return prev;
        return {
          views: prev.views + (payload.views ?? 0),
          encounters: prev.encounters + (payload.encounters ?? 0),
          completes: prev.completes,
          saves: Math.max(0, prev.saves + (payload.saves ?? 0)),
          shares: Math.max(0, prev.shares + (payload.shares ?? 0)),
          comments: Math.max(0, prev.comments + (payload.comments ?? 0)),
        };
      });
    };

    channel.bind("engagement-metrics", onUpdate);
    return () => {
      channel.unbind("engagement-metrics", onUpdate);
      unsubscribeChannel(ch);
    };
  }, [wiredId, enabled]);

  return metrics;
}
