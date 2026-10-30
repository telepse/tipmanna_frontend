"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type { UserInfo, PusherTrackingHook } from "@/types/tracking.types";
import { getOrCreateAnonymousViewer } from "@/lib/anonymous-viewer";
import { isExploreE2eFixturesActiveOnClient } from "@/lib/explore-e2e-fixtures-gate";
import {
  globalTvPresenceTrackActivity,
  subscribeGlobalTvPresence,
} from "@/lib/global-tv-presence-hub";

interface UsePusherTrackingGlobalTVProps {
  tvId: string;
  userInfo: UserInfo;
}

function resolvePresenceUser(userInfo: UserInfo): UserInfo {
  if (userInfo?.id?.trim()) return userInfo;
  return getOrCreateAnonymousViewer();
}

/** Global TV viewer count + presence; one shared Pusher / join lifecycle per `{@link tvId}`. */
export const usePusherTrackingGlobalTV = ({
  tvId,
  userInfo,
}: UsePusherTrackingGlobalTVProps): PusherTrackingHook => {
  const [activeUsers, setActiveUsers] = useState<UserInfo[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [joinUser, setJoinUser] = useState<UserInfo>(() =>
    resolvePresenceUser(userInfo)
  );

  const userInfoRef = useRef(joinUser);
  userInfoRef.current = joinUser;

  useEffect(() => {
    const resolved = resolvePresenceUser(userInfo);
    setJoinUser(prev => (prev.id === resolved.id ? prev : resolved));
  }, [userInfo]);

  const leaveTV = useCallback(async () => {
    /** Presence leave runs when last subscriber unsubscribes; manual leave unsupported for shared hubs. */
  }, []);

  const trackActivity = useCallback(
    async (activity: string) => {
      if (isExploreE2eFixturesActiveOnClient()) return;
      await globalTvPresenceTrackActivity(tvId, activity);
    },
    [tvId]
  );

  useEffect(() => {
    if (isExploreE2eFixturesActiveOnClient()) return undefined;
    if (!tvId || !joinUser.id?.trim()) return undefined;

    return subscribeGlobalTvPresence({
      tvId,
      getJoinUserInfo: () => userInfoRef.current,
      onUsers: setActiveUsers,
      onConnectedChange: setIsConnected,
    });
  }, [tvId, joinUser.id]);

  useEffect(() => {
    if (isExploreE2eFixturesActiveOnClient()) return undefined;
    if (!tvId || !joinUser.id?.trim()) return undefined;

    void trackActivity("viewing_tv");

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void trackActivity("viewing_tv");
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [tvId, joinUser.id, trackActivity]);

  return {
    activeUsers,
    isConnected,
    trackActivity,
    leaveEvent: leaveTV,
  };
};
