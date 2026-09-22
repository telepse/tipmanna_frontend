"use client";

import { useEffect } from "react";
import { subscribeChannel, unsubscribeChannel } from "@/lib/pusher";
import { animLog } from "@/lib/animationDebug";
import type { ScreenFunnelPosition } from "@/lib/screen-funnel-position";
import { normalizeScreenFunnelPosition } from "@/lib/screen-funnel-position";

export type ScreenOverlayLiveState = {
  amountToRaise: number;
  amountRaised: number;
  numOfTips: number;
  latestTipAmount: number;
  eventBackground: string | null;
  hideProgressBarAmount: boolean;
  showLatestAmount: boolean;
  tipUsageDisclosure: unknown[];
  performers: unknown[];
  projects: unknown[];
  showPinnedOnScreen: boolean;
  funnelPosition: ScreenFunnelPosition;
};

type ScreenDisplayBroadcast = {
  amountToRaise?: number;
  amountRaised?: number;
  numOfTips?: number;
  latestTipAmount?: number;
  eventBackground?: string | null;
  hideProgressBarAmount?: boolean;
  showLatestAmount?: boolean;
  tipUsageDisclosure?: unknown[];
  performers?: unknown[];
  projects?: unknown[];
  showPinnedOnScreen?: boolean;
  funnelPosition?: string;
};

/**
 * Public channel `event-{eventId}` only — no private-event subscription (OBS overlay).
 */
export function useScreenOverlayPublicSync(
  eventId: string,
  onPatch: (patch: Partial<ScreenOverlayLiveState>) => void
): void {
  useEffect(() => {
    if (!eventId) return;

    const channelName = `event-${eventId}`;
    const channel = subscribeChannel(channelName);
    if (!channel) return;

    const applyBroadcast = (data: ScreenDisplayBroadcast) => {
      animLog("screen-overlay-display-state", data);
      onPatch({
        ...(typeof data.amountToRaise === "number"
          ? { amountToRaise: data.amountToRaise }
          : {}),
        ...(typeof data.amountRaised === "number"
          ? { amountRaised: data.amountRaised }
          : {}),
        ...(typeof data.numOfTips === "number"
          ? { numOfTips: data.numOfTips }
          : {}),
        ...(typeof data.latestTipAmount === "number"
          ? { latestTipAmount: data.latestTipAmount }
          : {}),
        ...(data.eventBackground !== undefined
          ? { eventBackground: data.eventBackground }
          : {}),
        ...(typeof data.hideProgressBarAmount === "boolean"
          ? { hideProgressBarAmount: data.hideProgressBarAmount }
          : {}),
        ...(typeof data.showLatestAmount === "boolean"
          ? { showLatestAmount: data.showLatestAmount }
          : {}),
        ...(Array.isArray(data.tipUsageDisclosure)
          ? { tipUsageDisclosure: data.tipUsageDisclosure }
          : {}),
        ...(Array.isArray(data.performers)
          ? { performers: data.performers }
          : {}),
        ...(Array.isArray(data.projects) ? { projects: data.projects } : {}),
        ...(typeof data.showPinnedOnScreen === "boolean"
          ? { showPinnedOnScreen: data.showPinnedOnScreen }
          : {}),
        ...(data.funnelPosition
          ? {
              funnelPosition: normalizeScreenFunnelPosition(
                data.funnelPosition
              ),
            }
          : {}),
      });
    };

    const handleAmount = (data: {
      amountRaised?: number;
      numOfTips?: number;
      pinnedPerformers?: unknown[];
      pinnedProjects?: unknown[];
    }) => {
      onPatch({
        ...(typeof data.amountRaised === "number"
          ? { amountRaised: data.amountRaised }
          : {}),
        ...(typeof data.numOfTips === "number"
          ? { numOfTips: data.numOfTips }
          : {}),
        ...(Array.isArray(data.pinnedPerformers)
          ? { performers: data.pinnedPerformers }
          : {}),
        ...(Array.isArray(data.pinnedProjects)
          ? { projects: data.pinnedProjects }
          : {}),
      });
    };

    const handleLatestTip = (data: { latestTipAmount?: number }) => {
      if (typeof data.latestTipAmount === "number") {
        onPatch({ latestTipAmount: data.latestTipAmount });
      }
    };

    const handleSession = (data: { amountToRaise?: number }) => {
      if (typeof data.amountToRaise === "number") {
        onPatch({ amountToRaise: data.amountToRaise });
      }
    };

    channel.bind("screen-display-state", applyBroadcast);
    channel.bind("event-amount-updated", handleAmount);
    channel.bind("latest-tip-updated", handleLatestTip);
    channel.bind("session-activated", handleSession);

    return () => {
      channel.unbind("screen-display-state", applyBroadcast);
      channel.unbind("event-amount-updated", handleAmount);
      channel.unbind("latest-tip-updated", handleLatestTip);
      channel.unbind("session-activated", handleSession);
      unsubscribeChannel(channelName);
    };
  }, [eventId, onPatch]);
}
