"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Lock, Mail } from "lucide-react";
import { toast } from "react-toastify";

import {
  getEventRoomAccessAction,
  submitEventRoomAccessAction,
} from "@/actions/events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { persistEventRoomInviteToken } from "@/lib/event-room-invite-cookie";

const inviteStorageKey = (eventId: string) => `event-room-invite:${eventId}`;
const accessCodeStorageKey = (eventId: string) =>
  `event-room-access-code:${eventId}`;
const accessEmailStorageKey = (eventId: string) =>
  `event-room-access-email:${eventId}`;

export function getStoredEventRoomInviteToken(eventId: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(inviteStorageKey(eventId));
}

function getStoredAccessCode(eventId: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(accessCodeStorageKey(eventId));
}

function getStoredAccessEmail(eventId: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(accessEmailStorageKey(eventId));
}

type Props = {
  eventId: string;
  children: React.ReactNode;
};

type AccessMode =
  | "public"
  | "invite_only"
  | "host_code"
  | "custom_code"
  | "email_gate"
  | "community_members";

type GateHints = {
  requiresCode?: boolean;
  requiresEmail?: boolean;
  requiresCommunityMembership?: boolean;
  requiresInvite?: boolean;
};

type AccessPayload = {
  accessMode?: AccessMode;
  allowed?: boolean;
  reason?: string;
  pending?: boolean;
  gate?: GateHints;
};

export function PrivateEventRoomBlocked({
  accessMode = "invite_only",
  pending = false,
}: {
  accessMode?: AccessMode;
  pending?: boolean;
}) {
  const title =
    accessMode === "community_members"
      ? "Community members only"
      : accessMode === "email_gate"
        ? pending
          ? "Access request pending"
          : "Verify your email to enter"
        : accessMode === "host_code" || accessMode === "custom_code"
          ? "Enter access code"
          : "Private event room";

  const description =
    accessMode === "community_members"
      ? "Join this host's community to access the event room."
      : pending
        ? "The host will review your request. Check back soon."
        : accessMode === "invite_only"
          ? "Open the link from your invitation email to enter."
          : "Complete the form below or sign in if you already have access.";

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
      <Lock className="text-muted-foreground size-10" />
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-muted-foreground text-sm">{description}</p>
      <Button
        asChild
        variant="outline"
      >
        <Link href="/">Back home</Link>
      </Button>
    </div>
  );
}

function EventRoomAccessForm({
  eventId,
  accessMode,
  gate,
  pending,
  onSuccess,
}: {
  eventId: string;
  accessMode: AccessMode;
  gate?: GateHints;
  pending?: boolean;
  onSuccess: () => void;
}) {
  const [accessCode, setAccessCode] = useState(
    () => getStoredAccessCode(eventId) ?? ""
  );
  const [email, setEmail] = useState(() => getStoredAccessEmail(eventId) ?? "");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const res = await submitEventRoomAccessAction(eventId, {
        accessCode: gate?.requiresCode ? accessCode.trim() : undefined,
        email: gate?.requiresEmail ? email.trim() : undefined,
      });
      if (!res.success || !res.data) {
        toast.error(res.message ?? "Could not verify access");
        return;
      }
      const data = res.data as AccessPayload;
      if (data.allowed) {
        if (accessCode.trim()) {
          window.localStorage.setItem(
            accessCodeStorageKey(eventId),
            accessCode.trim()
          );
        }
        if (email.trim()) {
          window.localStorage.setItem(
            accessEmailStorageKey(eventId),
            email.trim()
          );
        }
        onSuccess();
        return;
      }
      if (data.pending) {
        toast.info("Access request submitted — awaiting host approval");
        onSuccess();
        return;
      }
      toast.error("Access denied");
    } finally {
      setBusy(false);
    }
  };

  if (pending) {
    return (
      <PrivateEventRoomBlocked
        accessMode={accessMode}
        pending
      />
    );
  }

  if (gate?.requiresInvite && accessMode === "invite_only") {
    return <PrivateEventRoomBlocked accessMode={accessMode} />;
  }

  if (gate?.requiresCommunityMembership) {
    return <PrivateEventRoomBlocked accessMode={accessMode} />;
  }

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div className="space-y-2 text-center">
        <Lock className="text-muted-foreground mx-auto size-10" />
        <h1 className="text-2xl font-semibold">Event room access</h1>
        <p className="text-muted-foreground text-sm">
          {gate?.requiresCode
            ? "Enter the access code from your host."
            : "Enter your email to request access."}
        </p>
      </div>

      <div className="space-y-4">
        {gate?.requiresCode ? (
          <div className="space-y-2">
            <Label htmlFor="event-access-code">Access code</Label>
            <Input
              id="event-access-code"
              value={accessCode}
              onChange={e => setAccessCode(e.target.value)}
              autoComplete="off"
            />
          </div>
        ) : null}

        {gate?.requiresEmail && accessMode === "email_gate" ? (
          <div className="space-y-2">
            <Label htmlFor="event-access-email">Email</Label>
            <Input
              id="event-access-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
        ) : null}

        <Button
          type="button"
          className="w-full"
          disabled={busy}
          onClick={() => void submit()}
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              <Mail className="mr-2 size-4" />
              Continue
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export function EventRoomAccessGate({ eventId, children }: Props) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(true);
  const [accessMode, setAccessMode] = useState<AccessMode>("public");
  const [gate, setGate] = useState<GateHints | undefined>();
  const [pending, setPending] = useState(false);

  const refreshAccess = useCallback(async () => {
    const inviteToken = getStoredEventRoomInviteToken(eventId);
    if (inviteToken) {
      persistEventRoomInviteToken(eventId, inviteToken);
    }
    const res = await getEventRoomAccessAction(eventId, inviteToken, {
      accessCode: getStoredAccessCode(eventId),
      email: getStoredAccessEmail(eventId),
    });
    if (!res.success || !res.data) {
      setAllowed(true);
      setLoading(false);
      return;
    }
    const data = res.data as AccessPayload;
    const mode = data.accessMode ?? "public";
    setAccessMode(mode);
    setGate(data.gate);
    setPending(Boolean(data.pending));
    if (mode === "public") {
      setAllowed(true);
      setLoading(false);
      return;
    }
    setAllowed(Boolean(data.allowed));
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    void refreshAccess();
  }, [refreshAccess]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <EventRoomAccessForm
        eventId={eventId}
        accessMode={accessMode}
        gate={gate}
        pending={pending}
        onSuccess={() => void refreshAccess()}
      />
    );
  }

  return <>{children}</>;
}
