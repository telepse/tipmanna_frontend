"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { getPusherClient } from "@/lib/pusher";
import { animLog } from "@/lib/animationDebug";
import type { Message } from "@/types";

export interface EventPusherProviderProps {
  eventId: string;
  children: ReactNode;
  onAmountUpdated: (data: {
    amountRaised?: number;
    numOfTips?: number;
  }) => void;
  onLatestTipUpdated: (latestTipAmount: number) => void;
  onSessionActivated: (amountToRaise: number) => void;
  onScreenSettingsUpdated: (data: {
    eventBackground: string;
    hideProgressBarAmount: boolean;
    showLatestAmount: boolean;
    tipUsageDisclosure: unknown[];
    performers: unknown[];
  }) => void;
  onNewChatMessage: (message: Message) => void;
}

/**
 * Single coordinator for event room Pusher channels on the shared client.
 * Binds public `event-{id}` and private `private-event-{id}` once; children must not subscribe directly.
 */
export function EventPusherProvider({
  eventId,
  children,
  onAmountUpdated,
  onLatestTipUpdated,
  onSessionActivated,
  onScreenSettingsUpdated,
  onNewChatMessage,
}: EventPusherProviderProps) {
  const onAmountUpdatedRef = useRef(onAmountUpdated);
  const onLatestTipUpdatedRef = useRef(onLatestTipUpdated);
  const onSessionActivatedRef = useRef(onSessionActivated);
  const onScreenSettingsUpdatedRef = useRef(onScreenSettingsUpdated);
  const onNewChatMessageRef = useRef(onNewChatMessage);

  onAmountUpdatedRef.current = onAmountUpdated;
  onLatestTipUpdatedRef.current = onLatestTipUpdated;
  onSessionActivatedRef.current = onSessionActivated;
  onScreenSettingsUpdatedRef.current = onScreenSettingsUpdated;
  onNewChatMessageRef.current = onNewChatMessage;

  useEffect(() => {
    if (!eventId) return;

    const client = getPusherClient();
    if (!client) return;

    const publicChannel = client.subscribe(`event-${eventId}`);
    const privateChannel = client.subscribe(`private-event-${eventId}`);

    const handleAmount = (data: {
      amountRaised: number;
      numOfTips: number;
    }) => {
      onAmountUpdatedRef.current({
        amountRaised:
          typeof data.amountRaised === "number" ? data.amountRaised : undefined,
        numOfTips:
          typeof data.numOfTips === "number" ? data.numOfTips : undefined,
      });
    };

    const handleLatestTip = (data: { latestTipAmount: number }) => {
      if (typeof data.latestTipAmount === "number")
        onLatestTipUpdatedRef.current(data.latestTipAmount);
    };

    const handleSession = (data: { amountToRaise: number }) => {
      if (typeof data.amountToRaise === "number")
        onSessionActivatedRef.current(data.amountToRaise);
      console.log(data);
    };

    const handleScreenSettings = (data: {
      eventBackground: string;
      hideProgressBarAmount: boolean;
      showLatestAmount: boolean;
      tipUsageDisclosure: unknown[];
      performers: unknown[];
    }) => {
      animLog("🎙️ screen settings", data);
      console.log(data.performers);
      onScreenSettingsUpdatedRef.current({
        eventBackground: data.eventBackground,
        hideProgressBarAmount: data.hideProgressBarAmount,
        showLatestAmount: data.showLatestAmount,
        tipUsageDisclosure: data.tipUsageDisclosure,
        performers: data.performers,
      });
    };

    const handleNewMessage = (message: Message) => {
      const formattedMessage = {
        ...message,
        time:
          message.createdAt ||
          new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
      };
      onNewChatMessageRef.current(formattedMessage);
    };

    publicChannel.bind("event-amount-updated", handleAmount);
    publicChannel.bind("latest-tip-updated", handleLatestTip);
    publicChannel.bind("session-activated", handleSession);
    publicChannel.bind("new-message", handleNewMessage);
    privateChannel.bind("screen-settings-updated", handleScreenSettings);

    return () => {
      publicChannel.unbind_all();
      privateChannel.unbind_all();
      client.unsubscribe(`event-${eventId}`);
      client.unsubscribe(`private-event-${eventId}`);
    };
  }, [eventId]);

  return <>{children}</>;
}
