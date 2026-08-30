"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { buildContentSharePath } from "@/lib/public-video-url";
import {
  buildReturnToWithDrawerHints,
  writePlaybackReturn,
  type PlaybackReturnContext,
} from "@/lib/playback-return-stack";

export type OpenContentWithReturnArgs = {
  eventId: string;
  channelId: string;
  returnTo: string;
  label?: string;
  playlistId?: string;
  explore?: PlaybackReturnContext["explore"];
  drawer?: PlaybackReturnContext["drawer"];
  profileUi?: PlaybackReturnContext["profileUi"];
  onBeforeNavigate?: () => void;
};

export function useOpenContentWithReturn() {
  const router = useRouter();

  return useCallback(
    (args: OpenContentWithReturnArgs) => {
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
        profileUi: args.profileUi,
      });

      router.push(
        buildContentSharePath({
          eventId,
          channelId,
          playlistWatch: Boolean(args.playlistId?.trim()),
          playlistId: args.playlistId,
        })
      );
    },
    [router]
  );
}
