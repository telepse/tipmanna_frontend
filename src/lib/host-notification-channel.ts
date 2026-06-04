"use client";

import type { Channel } from "pusher-js";
import { subscribeChannel, unsubscribeChannel } from "@/lib/pusher";

const IN_APP_EVENT = "in-app-notification";

type NotifyListener = () => void;

const listenersByHost = new Map<string, Set<NotifyListener>>();
const channelsByHost = new Map<string, Channel>();
const handlersByHost = new Map<string, () => void>();

function emitHostNotifications(hostId: string): void {
  const listeners = listenersByHost.get(hostId);
  if (!listeners) return;
  for (const listener of listeners) {
    try {
      listener();
    } catch (err) {
      console.error("[host-notification] listener failed", err);
    }
  }
}

/**
 * One Pusher bind per host for `in-app-notification`; multiple UI surfaces
 * (sidebar badge, notification bell, community dashboard) share this hub.
 */
export function subscribeHostInAppNotifications(
  hostId: string,
  listener: NotifyListener
): () => void {
  if (!hostId) return () => {};

  let set = listenersByHost.get(hostId);
  if (!set) {
    set = new Set();
    listenersByHost.set(hostId, set);

    const channelName = `community-host-${hostId}`;
    const channel = subscribeChannel(channelName);
    if (channel) {
      channelsByHost.set(hostId, channel);
      const handler = () => emitHostNotifications(hostId);
      handlersByHost.set(hostId, handler);
      channel.bind(IN_APP_EVENT, handler);
    }
  }

  set.add(listener);

  return () => {
    const current = listenersByHost.get(hostId);
    if (!current) return;
    current.delete(listener);
    if (current.size > 0) return;

    listenersByHost.delete(hostId);
    const channel = channelsByHost.get(hostId);
    const handler = handlersByHost.get(hostId);
    if (channel && handler) {
      channel.unbind(IN_APP_EVENT, handler);
    }
    channelsByHost.delete(hostId);
    handlersByHost.delete(hostId);
    unsubscribeChannel(`community-host-${hostId}`);
  };
}
