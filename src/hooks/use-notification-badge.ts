"use client";

import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { getNotificationsUnreadCountAction } from "@/actions/notifications";
import { isExploreE2eFixturesActiveOnClient } from "@/lib/explore-e2e-fixtures-gate";
import { getAuthToken, getDeviceKey } from "@/lib/getAuthToken";
import { subscribeChannel, unsubscribeChannel } from "@/lib/pusher";
import { subscribeHostInAppNotifications } from "@/lib/host-notification-channel";
import { RootState } from "@/redux/store";

export function useNotificationBadge() {
  const user = useSelector((state: RootState) => state.auth.user);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

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

    const res = await getNotificationsUnreadCountAction(token);
    if (res.success && res.data) {
      setUnreadCount(res.data.count);
    } else {
      setUnreadCount(0);
    }
    setLoading(false);
  }, [user?.id, user?.role]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!user?.id) return;

    const role = user.role?.toLowerCase() ?? "tipper";

    if (role === "host") {
      return subscribeHostInAppNotifications(user.id, () => {
        void refresh();
      });
    }

    const chName =
      role === "visitor"
        ? `visitor-notifications-${user.id}`
        : role === "admin" || role === "superadmin"
          ? `superadmin-notifications-${user.id}`
          : `tipper-notifications-${user.id}`;

    const channel = subscribeChannel(chName);
    if (!channel) return;

    const handler = () => {
      void refresh();
    };
    channel.bind("in-app-notification", handler);

    return () => {
      channel.unbind("in-app-notification", handler);
      unsubscribeChannel(chName);
    };
  }, [user?.id, user?.role, refresh]);

  return { unreadCount, loading, refresh };
}
