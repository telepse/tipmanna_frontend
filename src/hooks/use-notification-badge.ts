"use client";

import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { getNotificationsUnreadCountAction } from "@/actions/notifications";
import { getAuthToken, getDeviceKey } from "@/lib/getAuthToken";
import { getPusherClient } from "@/lib/pusher";
import { RootState } from "@/redux/store";

export function useNotificationBadge() {
  const user = useSelector((state: RootState) => state.auth.user);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
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

    const client = getPusherClient();
    if (!client) return;

    const role = user.role?.toLowerCase() ?? "tipper";
    const chName =
      role === "host"
        ? `community-host-${user.id}`
        : role === "visitor"
          ? `visitor-notifications-${user.id}`
          : role === "admin" || role === "superadmin"
            ? `superadmin-notifications-${user.id}`
            : `tipper-notifications-${user.id}`;
    const channel = client.subscribe(chName);
    channel.bind("in-app-notification", () => {
      void refresh();
    });

    return () => {
      channel.unbind_all();
      client.unsubscribe(chName);
    };
  }, [user?.id, refresh]);

  return { unreadCount, loading, refresh };
}
