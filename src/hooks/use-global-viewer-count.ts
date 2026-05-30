"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type { UserInfo, PusherTrackingHook } from "@/types/tracking.types";
import {
  globalTvPresenceTrackActivity,
  subscribeGlobalTvPresence,
} from "@/lib/global-tv-presence-hub";

interface UsePusherTrackingGlobalTVProps {
  tvId: string;
  userInfo: UserInfo;
}

/** Global TV viewer count + presence; one shared Pusher / join lifecycle per `{@link tvId}`. */
export const usePusherTrackingGlobalTV = ({
  tvId,
  userInfo,
}: UsePusherTrackingGlobalTVProps): PusherTrackingHook => {
  const [activeUsers, setActiveUsers] = useState<UserInfo[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const userInfoRef = useRef(userInfo);
  userInfoRef.current = userInfo;

  const leaveTV = useCallback(async () => {
    /** Presence leave runs when last subscriber unsubscribes; manual leave unsupported for shared hubs. */
  }, []);

  const trackActivity = useCallback(
    async (activity: string) => {
      await globalTvPresenceTrackActivity(tvId, activity);
    },
    [tvId]
  );

  useEffect(() => {
    if (!tvId || !userInfoRef.current?.id) return undefined;

    return subscribeGlobalTvPresence({
      tvId,
      getJoinUserInfo: () => userInfoRef.current,
      onUsers: setActiveUsers,
      onConnectedChange: setIsConnected,
    });
  }, [tvId, userInfo.id]);

  return {
    activeUsers,
    isConnected,
    trackActivity,
    leaveEvent: leaveTV,
  };
};
