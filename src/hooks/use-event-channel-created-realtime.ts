"use client";

import { useEffect, useRef } from "react";

import { subscribeChannel, unsubscribeChannel } from "@/lib/pusher";
import type { EventRoomVideoChannel } from "@/types/event-room-channel.types";

export type ChannelCreatedPayload = {
  id: string;
  url: string;
  title?: string;
  isDefault?: boolean;
};

/**
 * Subscribe to new event-channel rows on `event-{eventId}` (cohost / multi-tab sync).
 */
export function useEventChannelCreatedRealtime(
  eventId: string | undefined,
  onCreated: (channel: EventRoomVideoChannel) => void
) {
  const onCreatedRef = useRef(onCreated);
  onCreatedRef.current = onCreated;

  useEffect(() => {
    if (!eventId?.trim()) return;

    const channelName = `event-${eventId.trim()}`;
    const channel = subscribeChannel(channelName);
    if (!channel) return;

    const handler = (payload: ChannelCreatedPayload) => {
      if (!payload?.id || !payload?.url) return;
      onCreatedRef.current({
        id: String(payload.id),
        url: payload.url,
        title: payload.title,
        isDefault: payload.isDefault === true,
      });
    };

    channel.bind("channel-created", handler);

    return () => {
      channel.unbind("channel-created", handler);
      unsubscribeChannel(channelName);
    };
  }, [eventId]);
}
