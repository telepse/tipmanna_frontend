"use client";

import { useEffect } from "react";

import {
  COMMUNITY_DISPLAY_UPDATED_EVENT,
  communityDisplayChannel,
  parseDisplayUpdatedPayload,
} from "@/lib/community-room-display";
import { subscribeChannel, unsubscribeChannel } from "@/lib/pusher";

/**
 * Subscribes to `community-{id}` / `display-updated` and invokes callback when payload is valid.
 */
export function useCommunityDisplayUpdated(
  communityId: string | null | undefined,
  onUpdated: (communityId: string) => void
) {
  useEffect(() => {
    const id = communityId?.trim();
    if (!id) return;

    const channelName = communityDisplayChannel(id);
    const channel = subscribeChannel(channelName);
    if (!channel) return;

    const handler = (payload: unknown) => {
      const parsed = parseDisplayUpdatedPayload(payload);
      if (!parsed || parsed.communityId !== id) return;
      onUpdated(parsed.communityId);
    };

    channel.bind(COMMUNITY_DISPLAY_UPDATED_EVENT, handler);
    return () => {
      channel.unbind(COMMUNITY_DISPLAY_UPDATED_EVENT, handler);
      unsubscribeChannel(channelName);
    };
  }, [communityId, onUpdated]);
}
