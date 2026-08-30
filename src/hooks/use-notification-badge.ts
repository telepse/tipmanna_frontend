"use client";

import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import {
  getNotificationsUnreadCountAction,
  getHostNotificationsUnreadCountAction,
} from "@/actions/notifications";
import { isExploreE2eFixturesActiveOnClient } from "@/lib/explore-e2e-fixtures-gate";
import { getAuthToken, getDeviceKey } from "@/lib/getAuthToken";
import {
  getHostUserFromCookies,
  hasActiveHostSession,
} from "@/lib/host-session-client";
import { subscribeChannel, unsubscribeChannel } from "@/lib/pusher";
import { subscribeHostInAppNotifications } from "@/lib/host-notification-channel";
import { RootState } from "@/redux/store";

export function useNotificationBadge() {
  const user = useSelector((state: RootState) => state.auth.user);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const hostSessionActive = hasActiveHostSession(getHostUserFromCookies()?.id);

  const refresh = useCallback(async () => {
    if (isExploreE2eFixturesActiveOnClient()) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }
    const role = user?.role?.toUpperCase();
    setLoading(true);
    const token = getAuthToken();
    const deviceKey = getDeviceKey();

    if (!user?.id || role === "VISITOR") {
      if (!deviceKey) {
        setUnreadCount(0);
        setLoading(false);
        return;
      }
      const res = await getNotificationsUnreadCountAction(null, deviceKey);
      setUnreadCount(res.success && res.data ? res.data.count : 0);
      setLoading(false);
      return;
    }

    const fetches: Promise<{
      success: boolean;
      data?: { count: number } | null;
    }>[] = [getNotificationsUnreadCountAction(token)];

    if (hostSessionActive) {
      fetches.push(getHostNotificationsUnreadCountAction());
    }

    const results = await Promise.all(fetches);
    const total = results.reduce(
      (sum, res) => sum + (res.success && res.data ? res.data.count : 0),
      0
    );
    setUnreadCount(total);
    setLoading(false);
  }, [user?.id, user?.role, hostSessionActive]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!user?.id) return;

    const role = user.role?.toLowerCase() ?? "tipper";
    const linkedHostUser = getHostUserFromCookies();
    const cleanups: Array<() => void> = [];

    if (linkedHostUser?.id && hostSessionActive) {
      cleanups.push(
        subscribeHostInAppNotifications(linkedHostUser.id, () => {
          void refresh();
        })
      );
    }

    const chName =
      role === "visitor"
        ? `visitor-notifications-${user.id}`
        : role === "admin" || role === "superadmin"
          ? `superadmin-notifications-${user.id}`
          : `tipper-notifications-${user.id}`;

    const channel = subscribeChannel(chName);
    if (channel) {
      const handler = () => {
        void refresh();
      };
      channel.bind("in-app-notification", handler);
      cleanups.push(() => {
        channel.unbind("in-app-notification", handler);
        unsubscribeChannel(chName);
      });
    }

    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  }, [user?.id, user?.role, hostSessionActive, refresh]);

  return { unreadCount, loading, refresh };
}
