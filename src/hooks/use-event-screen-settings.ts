"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { getPusherClient } from "@/lib/pusher";
import { animLog } from "@/lib/animationDebug";

export type EventScreenSettingsState = {
  eventBackground: string;
  hideProgressBarAmount: boolean;
  showLatestAmount: boolean;
  tipUsageDisclosure: unknown[];
  performers: unknown[];
};

/**
 * Private channel `private-event-{eventId}` — screen-settings-updated (host display sync).
 */
export function useEventScreenSettings(
  eventId: string,
  initial: EventScreenSettingsState
): {
  screenSettings: EventScreenSettingsState;
  setScreenSettings: Dispatch<SetStateAction<EventScreenSettingsState>>;
} {
  const [screenSettings, setScreenSettings] =
    useState<EventScreenSettingsState>(initial);

  useEffect(() => {
    if (!eventId) return;

    const client = getPusherClient();
    if (!client) return;

    const privateChannel = client.subscribe(`private-event-${eventId}`);

    const handler = (data: {
      eventBackground: string;
      hideProgressBarAmount: boolean;
      showLatestAmount: boolean;
      tipUsageDisclosure: unknown[];
      performers: unknown[];
    }) => {
      animLog("screen-settings-updated", data);
      setScreenSettings({
        eventBackground: data.eventBackground,
        hideProgressBarAmount: data.hideProgressBarAmount,
        showLatestAmount: data.showLatestAmount,
        tipUsageDisclosure: data.tipUsageDisclosure,
        performers: data.performers,
      });
    };

    privateChannel.bind("screen-settings-updated", handler);

    return () => {
      privateChannel.unbind("screen-settings-updated", handler);
      client.unsubscribe(`private-event-${eventId}`);
    };
  }, [eventId]);

  return { screenSettings, setScreenSettings };
}
