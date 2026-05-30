"use client";

import { useEffect } from "react";
import { getPusherClient } from "@/lib/pusher";

type NewMessagePayload = {
  id?: string;
  username?: string;
  secondaryText?: string;
  eventChannelId?: string;
  createdAt?: string;
  characterName?: string;
};

type Props = {
  eventId: string;
  channelId: string | null;
  enabled: boolean;
  onNewComment: (comment: {
    id: string;
    username: string;
    text: string;
    createdAt: string;
  }) => void;
};

/** Subscribe to event room messages while comment drawer is open. */
export function useCommentDrawerRealtime({
  eventId,
  channelId,
  enabled,
  onNewComment,
}: Props) {
  useEffect(() => {
    if (!enabled || !eventId?.trim()) return;
    const pusher = getPusherClient();
    if (!pusher) return;

    const channelName = `event-${eventId.trim()}`;
    const channel = pusher.subscribe(channelName);

    const handler = (data: NewMessagePayload) => {
      if (!data?.secondaryText?.trim()) return;
      if (
        channelId &&
        data.eventChannelId &&
        data.eventChannelId !== channelId
      ) {
        return;
      }
      onNewComment({
        id: String(data.id ?? `live-${Date.now()}`),
        username: String(data.username ?? "Guest"),
        text: String(data.secondaryText),
        createdAt: String(data.createdAt ?? new Date().toISOString()),
      });
    };

    channel.bind("new-message", handler);

    return () => {
      channel.unbind("new-message", handler);
      pusher.unsubscribe(channelName);
    };
  }, [enabled, eventId, channelId, onNewComment]);
}
