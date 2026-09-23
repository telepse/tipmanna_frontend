"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";

import { Button } from "@/components/ui/button";
import {
  acceptEventRoomInviteAction,
  validateEventRoomInviteAction,
} from "@/actions/events";
import { TipperEmailOtpSignInDialog } from "@/components/auth/tipper-email-otp-sign-in-dialog";
import { persistEventRoomInviteToken } from "@/lib/event-room-invite-cookie";
import type { RootState } from "@/redux/store";

type Props = {
  eventId: string;
};

type MismatchState = {
  inviteEmail: string;
  signedInEmail: string;
};

export function EventRoomInviteAcceptClient({ eventId }: Props) {
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const user = useSelector((s: RootState) => s.auth.user);
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const [loading, setLoading] = useState(true);
  const [eventName, setEventName] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState<string | null>(null);
  const [invalid, setInvalid] = useState<string | null>(null);
  const [emailMismatch, setEmailMismatch] = useState<MismatchState | null>(
    null
  );
  const [signInOpen, setSignInOpen] = useState(false);
  const [accepting, setAccepting] = useState(false);

  const signedInEmail =
    isAuthenticated && user?.role !== "VISITOR" && user?.email?.trim()
      ? user.email.trim()
      : "";

  useEffect(() => {
    if (!token) {
      setInvalid("Missing invitation token.");
      setLoading(false);
      return;
    }

    void validateEventRoomInviteAction(token).then(res => {
      if (!res.success || !res.data) {
        setInvalid(res.message ?? "Invitation not found.");
        setLoading(false);
        return;
      }

      const data = res.data as {
        valid?: boolean;
        reason?: string;
        eventName?: string;
        email?: string;
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
      setInviteEmail(data.email?.trim() ?? null);
      setLoading(false);
    });
  }, [token]);

  const completeAccept = async () => {
    setAccepting(true);
    try {
      const accept = await acceptEventRoomInviteAction(token);
      if (!accept.success) {
        const msg = accept.message ?? "Could not accept invitation.";
        const inviteAddr = inviteEmail?.trim().toLowerCase() ?? "";
        if (msg.toLowerCase().includes("different email") && inviteAddr) {
          setEmailMismatch({
            inviteEmail: inviteAddr,
            signedInEmail: signedInEmail.toLowerCase(),
          });
          return;
        }
        setInvalid(msg);
        return;
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem(`event-room-invite:${eventId}`, token);
        persistEventRoomInviteToken(eventId, token);
      }

      toast.success("Invitation accepted");
      window.location.href = `/room/${encodeURIComponent(eventId)}`;
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
        <Loader2 className="size-8 animate-spin" />
        <p className="text-muted-foreground text-sm">Verifying invitation…</p>
      </div>
    );
  }

  if (emailMismatch) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Wrong account</h1>
        <p className="text-muted-foreground text-sm">
          This invitation was sent to{" "}
          <span className="text-foreground font-medium">
            {emailMismatch.inviteEmail}
          </span>
          . Sign in with that address to accept.
        </p>
        {emailMismatch.signedInEmail ? (
          <p className="text-muted-foreground text-xs">
            You are currently signed in as {emailMismatch.signedInEmail}.
          </p>
        ) : null}
        <Button
          type="button"
          className="w-full"
          onClick={() => setSignInOpen(true)}
        >
          Sign in with invited email
        </Button>
        <Button
          asChild
          variant="outline"
        >
          <Link href="/">Back home</Link>
        </Button>
        <TipperEmailOtpSignInDialog
          open={signInOpen}
          onOpenChange={setSignInOpen}
          signInTitle="Sign in with invited email"
          initialEmail={emailMismatch.inviteEmail}
          autoSendCode
          signupSurface="event_room"
          onVerified={() => {
            setSignInOpen(false);
            setEmailMismatch(null);
            void completeAccept();
          }}
        />
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

  const wrongAccountHint =
    inviteEmail &&
    signedInEmail &&
    signedInEmail.toLowerCase() !== inviteEmail.toLowerCase();

  return (
    <div className="mx-auto max-w-md space-y-4 py-16 text-center">
      <h1 className="text-xl font-semibold">Welcome to {eventName}</h1>
      {wrongAccountHint ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          This invite is for <span className="font-medium">{inviteEmail}</span>.
          You are signed in as {signedInEmail}. Verify with the invited email to
          continue.
        </p>
      ) : (
        <p className="text-muted-foreground text-sm">
          Verify your email{inviteEmail ? ` (${inviteEmail})` : ""} to accept
          this invitation and enter the event room.
        </p>
      )}
      <Button
        type="button"
        className="w-full"
        disabled={accepting}
        onClick={() => setSignInOpen(true)}
      >
        {accepting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          "Verify email to accept"
        )}
      </Button>
      <TipperEmailOtpSignInDialog
        open={signInOpen}
        onOpenChange={setSignInOpen}
        signInTitle="Verify email to accept invitation"
        initialEmail={inviteEmail ?? undefined}
        autoSendCode={Boolean(inviteEmail)}
        signupSurface="event_room"
        onVerified={() => {
          setSignInOpen(false);
          void completeAccept();
        }}
      />
    </div>
  );
}
