"use client";

import { useEffect, useMemo, useRef } from "react";
import { toast } from "react-toastify";
import { getVideoCoOwnerInviteStatusAction } from "@/actions/events";
import { subscribeChannel, unsubscribeChannel } from "@/lib/pusher";

type Options = {
  draftKeys: (string | null | undefined)[];
  extraInviteIds?: string[];
  enabled?: boolean;
  onApproved: () => void;
  successMessage?: string;
};

/**
 * Subscribes to Pusher for pending co-owner invites on the given draft keys.
 * Lives above step/modal boundaries so approval refreshes submit readiness
 * even when the invite form is unmounted.
 */
export function useCoOwnerPusherApprovalRefresh({
  draftKeys,
  extraInviteIds = [],
  enabled = true,
  onApproved,
  successMessage = "Co-owner approved",
}: Options) {
  const onApprovedRef = useRef(onApproved);
  onApprovedRef.current = onApproved;
  const successMessageRef = useRef(successMessage);
  successMessageRef.current = successMessage;

  const keysFingerprint = useMemo(
    () =>
      draftKeys
        .map(k => k?.trim() ?? "")
        .filter(Boolean)
        .sort()
        .join("|"),
    [draftKeys]
  );

  const extraFingerprint = useMemo(
    () => [...extraInviteIds].sort().join("|"),
    [extraInviteIds]
  );

  useEffect(() => {
    if (!enabled) return;

    const subscribed = new Set<string>();
    let cancelled = false;

    const bindInvite = (inviteId: string) => {
      const channelName = `coowner-invite-${inviteId}`;
      if (subscribed.has(channelName)) return;
      subscribed.add(channelName);

      const channel = subscribeChannel(channelName);
      if (!channel) return;

      const handler = (data: { status?: string }) => {
        if (data?.status === "approved") {
          toast.success(successMessageRef.current);
          onApprovedRef.current();
        }
      };

      channel.bind("co-owner-invite", handler);
    };

    for (const inviteId of extraInviteIds) {
      if (inviteId?.trim()) bindInvite(inviteId.trim());
    }

    const keys = keysFingerprint
      ? keysFingerprint.split("|").filter(Boolean)
      : [];

    void (async () => {
      for (const draftKey of keys) {
        if (cancelled) return;
        const res = await getVideoCoOwnerInviteStatusAction(draftKey);
        if (!res.success || cancelled) continue;
        const invites = (
          res.data as { invites?: { id: string; status: string }[] } | null
        )?.invites;
        for (const inv of invites ?? []) {
          if (inv.status === "pending") {
            bindInvite(inv.id);
          }
        }
      }
    })();

    return () => {
      cancelled = true;
      for (const channelName of subscribed) {
        unsubscribeChannel(channelName);
      }
    };
  }, [enabled, keysFingerprint, extraFingerprint]);
}
