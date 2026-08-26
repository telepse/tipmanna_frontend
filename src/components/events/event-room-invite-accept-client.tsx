"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import {
  acceptEventRoomInviteAction,
  validateEventRoomInviteAction,
} from "@/actions/events";

type Props = {
  eventId: string;
};

export function EventRoomInviteAcceptClient({ eventId }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token")?.trim() ?? "";
  const [loading, setLoading] = useState(true);
  const [eventName, setEventName] = useState<string | null>(null);
  const [invalid, setInvalid] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setInvalid("Missing invitation token.");
      setLoading(false);
      return;
    }

    void validateEventRoomInviteAction(token).then(async res => {
      if (!res.success || !res.data) {
        setInvalid(res.message ?? "Invitation not found.");
        setLoading(false);
        return;
      }

      const data = res.data as {
        valid?: boolean;
        reason?: string;
        eventName?: string;
        eventId?: string;
      };

      if (!data.valid) {
        setInvalid(
          data.reason === "expired"
            ? "This invite has expired."
            : "Invalid invite."
        );
        setLoading(false);
        return;
      }

      setEventName(data.eventName ?? "Event room");

      const accept = await acceptEventRoomInviteAction(token);
      if (!accept.success) {
        setInvalid(accept.message ?? "Could not accept invitation.");
        setLoading(false);
        return;
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem(`event-room-invite:${eventId}`, token);
      }

      setLoading(false);
      toast.success("Invitation accepted");
      router.replace(`/room/${encodeURIComponent(eventId)}`);
    });
  }, [eventId, router, token]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
        <Loader2 className="size-8 animate-spin" />
        <p className="text-muted-foreground text-sm">Verifying invitation…</p>
      </div>
    );
  }

  if (invalid) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Invitation unavailable</h1>
        <p className="text-muted-foreground text-sm">{invalid}</p>
        <Button asChild>
          <Link href="/">Back home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4 py-16 text-center">
      <h1 className="text-xl font-semibold">Welcome to {eventName}</h1>
      <p className="text-muted-foreground text-sm">
        Redirecting to the event room…
      </p>
    </div>
  );
}
