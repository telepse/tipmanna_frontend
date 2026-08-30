"use client";

import { useEffect, useRef } from "react";
import { subscribeChannel, unsubscribeChannel } from "@/lib/pusher";

export type DefaultChannelUpdatedPayload = {
  channelId: string;
  url: string;
  title: string;
  isLive?: boolean;
};

/**
 * Subscribe to host default-video changes on `event-{eventId}`.
 * Channel client and event room use different handlers via `onUpdated`.
 */
export function useDefaultChannelRealtime(
  eventId: string | undefined,
  onUpdated: (payload: DefaultChannelUpdatedPayload) => void
) {
  const onUpdatedRef = useRef(onUpdated);
  onUpdatedRef.current = onUpdated;

  useEffect(() => {
    if (!eventId?.trim()) return;

    const channelName = `event-${eventId.trim()}`;
    const channel = subscribeChannel(channelName);
    if (!channel) return;

    const handler = (payload: DefaultChannelUpdatedPayload) => {
      if (!payload?.channelId) return;
      onUpdatedRef.current(payload);
    };

    channel.bind("default-channel-updated", handler);

    return () => {
      channel.unbind("default-channel-updated", handler);
      unsubscribeChannel(channelName);
    };
  }, [eventId]);
}
