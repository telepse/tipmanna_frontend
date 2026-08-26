"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { getEventRoomAccessAction } from "@/actions/events";
import { Button } from "@/components/ui/button";

const inviteStorageKey = (eventId: string) => `event-room-invite:${eventId}`;

export function getStoredEventRoomInviteToken(eventId: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(inviteStorageKey(eventId));
}

type Props = {
  eventId: string;
  children: React.ReactNode;
};

export function EventRoomAccessGate({ eventId, children }: Props) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(true);
  const [accessMode, setAccessMode] = useState<"public" | "invite_only">(
    "public"
  );

  useEffect(() => {
    void getEventRoomAccessAction(eventId).then(res => {
      if (!res.success || !res.data) {
        setAllowed(true);
        setLoading(false);
        return;
      }
      const mode = (res.data as { accessMode?: string }).accessMode;
      const normalized =
        mode === "invite_only" ? "invite_only" : ("public" as const);
      setAccessMode(normalized);
      if (normalized === "public") {
        setAllowed(true);
        setLoading(false);
        return;
      }
      const token = getStoredEventRoomInviteToken(eventId);
      setAllowed(Boolean(token));
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

  return <>{children}</>;
}
