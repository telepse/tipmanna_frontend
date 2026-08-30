"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { getEventRoomAccessAction } from "@/actions/events";
import { Button } from "@/components/ui/button";
import { persistEventRoomInviteToken } from "@/lib/event-room-invite-cookie";

const inviteStorageKey = (eventId: string) => `event-room-invite:${eventId}`;

export function getStoredEventRoomInviteToken(eventId: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(inviteStorageKey(eventId));
}

type Props = {
  eventId: string;
  children: React.ReactNode;
};

type AccessPayload = {
  accessMode?: "public" | "invite_only";
  allowed?: boolean;
  reason?: string;
};

export function PrivateEventRoomBlocked() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold">Private event room</h1>
      <p className="text-muted-foreground text-sm">
        This event is invite-only. Open the link from your invitation email to
        enter.
      </p>
      <Button asChild>
        <Link href="/">Back home</Link>
      </Button>
    </div>
  );
}

export function EventRoomAccessGate({ eventId, children }: Props) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(true);
  const [accessMode, setAccessMode] = useState<"public" | "invite_only">(
    "public"
  );

  useEffect(() => {
    const inviteToken = getStoredEventRoomInviteToken(eventId);
    if (inviteToken) {
      persistEventRoomInviteToken(eventId, inviteToken);
    }
    void getEventRoomAccessAction(eventId, inviteToken).then(res => {
      if (!res.success || !res.data) {
        setAllowed(true);
        setLoading(false);
        return;
      }
      const data = res.data as AccessPayload;
      const mode =
        data.accessMode === "invite_only" ? "invite_only" : ("public" as const);
      setAccessMode(mode);
      if (mode === "public") {
        setAllowed(true);
        setLoading(false);
        return;
      }
      setAllowed(Boolean(data.allowed));
      setLoading(false);
    });
  }, [eventId]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin" />
      </div>
    );
  }

  if (!allowed && accessMode === "invite_only") {
    return <PrivateEventRoomBlocked />;
  }

  return <>{children}</>;
}
