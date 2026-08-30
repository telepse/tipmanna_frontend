"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { buildChannelSharePath } from "@/lib/public-video-url";
import {
  buildReturnToWithDrawerHints,
  writePlaybackReturn,
  type PlaybackReturnContext,
} from "@/lib/playback-return-stack";

export type OpenChannelWithReturnArgs = {
  eventId: string;
  channelId: string;
  returnTo: string;
  label?: string;
  explore?: PlaybackReturnContext["explore"];
  drawer?: PlaybackReturnContext["drawer"];
  discoverUi?: PlaybackReturnContext["discoverUi"];
  onBeforeNavigate?: () => void;
};

export function useOpenChannelWithReturn() {
  const router = useRouter();

  return useCallback(
    (args: OpenChannelWithReturnArgs) => {
      const eventId = args.eventId.trim();
      const channelId = args.channelId.trim();
      if (!eventId || !channelId) return;

      args.onBeforeNavigate?.();

      const returnTo = buildReturnToWithDrawerHints(args.returnTo, args.drawer);

      writePlaybackReturn({
        returnTo,
        label: args.label,
        explore: args.explore,
        drawer: args.drawer,
        discoverUi: args.discoverUi,
      });

      router.push(
        buildChannelSharePath({
          eventId,
          channelId,
        })
      );
    },
    [router]
  );
}
