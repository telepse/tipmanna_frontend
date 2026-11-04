"use client";

import Link from "next/link";

import { NativeBroadcastPanel } from "@/components/event-room/native-broadcast-panel";
import { AdvancedStudioPanel } from "@/components/host/advanced-studio-panel";
import { fetchCurrentEventBroadcastAction } from "@/actions/event-broadcast";
import {
  formatEventOwnershipDeniedMessage,
  isEventOwnershipDeniedMessage,
} from "@/lib/event-broadcast-authz-message";
import { useCallback, useEffect, useState } from "react";
import type { EventBroadcastRow } from "@/lib/event-broadcast-client";

type Props = {
  hostSlug: string;
  eventId: string;
  eventName: string;
  eventChannelId?: string;
};

/** LIVE-010 per-event explicit start surface (owner dashboard). */
export function HostEventBroadcastClient({
  hostSlug,
  eventId,
  eventName,
  eventChannelId,
}: Props) {
  const [broadcast, setBroadcast] = useState<EventBroadcastRow | null>(null);
  const [ownershipDenied, setOwnershipDenied] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refreshBroadcast = useCallback(async () => {
    const res = await fetchCurrentEventBroadcastAction(eventId, {
      preferHostSession: true,
    });
    if (res.success) {
      setBroadcast(res.data?.broadcast ?? null);
      setOwnershipDenied(false);
      setLoadError(null);
      return;
    }
    const message = String(
      res.message ?? res.error ?? "Broadcast status failed"
    );
    setBroadcast(null);
    // Owner-only dashboard: any 403 on broadcasts/current means this session
    // cannot operate the URL event (wrong host / wrong fixture).
    if (
      res.httpStatus === 403 ||
      isEventOwnershipDeniedMessage(message, res.httpStatus)
    ) {
      setOwnershipDenied(true);
      setLoadError(
        formatEventOwnershipDeniedMessage({ hostSlug, eventId })
      );
      return;
    }
    setOwnershipDenied(false);
    setLoadError(message);
  }, [eventId, hostSlug]);

  useEffect(() => {
    void refreshBroadcast();
  }, [refreshBroadcast]);

  return (
    <div className="mx-auto max-w-lg space-y-4 p-4">
      <div>
        <Link
          href={`/host/${hostSlug}/streaming`}
          className="text-muted-foreground text-xs hover:underline"
        >
          ← Native streaming
        </Link>
        <h1 className="mt-2 text-xl font-semibold">{eventName}</h1>
        <p className="text-muted-foreground text-sm">
          Explicit Go live controls for the event owner. Preview locally first,
          then claim publisher and join the scoped provider room when ready.
        </p>
      </div>
      {loadError ? (
        <p className="text-sm text-amber-800" role="alert">
          {loadError}
        </p>
      ) : null}
      {!ownershipDenied ? (
        <NativeBroadcastPanel
          eventId={eventId}
          isHost
          isCohost={false}
          eventChannelId={eventChannelId}
        />
      ) : null}
      {broadcast && !ownershipDenied ? (
        <AdvancedStudioPanel
          eventId={eventId}
          broadcast={broadcast}
          onRefresh={refreshBroadcast}
        />
      ) : null}
    </div>
  );
}
