"use client";

import useSWR from "swr";

import { getHostNotificationsUnreadCountAction } from "@/actions/notifications";

export function useHostCommunityNotificationBadge(
  communityId: string | null | undefined,
  enabled: boolean
) {
  const id = communityId?.trim();
  const key =
    enabled && id ? `host-community-notif-unread:${id}` : null;

  const { data, mutate, isValidating } = useSWR(
    key,
    async () => {
      const res = await getHostNotificationsUnreadCountAction({
        communityId: id!,
      });
      if (!res.success || res.data == null) return 0;
      return res.data.count ?? 0;
    },
    {
      revalidateOnFocus: true,
      dedupingInterval: 15_000,
    }
  );

  return {
    unreadCount: data ?? 0,
    refreshUnread: () => mutate(),
    loading: enabled && isValidating && data === undefined,
  };
}
