"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSelector } from "react-redux";
import { Bell, Loader2, Lock, Mail } from "lucide-react";
import { toast } from "react-toastify";

import {
  getEventRoomAccessAction,
  submitEventRoomAccessAction,
  type EventRoomAccessFormConfig,
} from "@/actions/events";
import { setEventReminderAction } from "@/actions/event-reminders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { TipperEmailOtpSignInDialog } from "@/components/auth/tipper-email-otp-sign-in-dialog";
import { JoinCommunityModal } from "@/components/community/join-community-modal";
import { persistEventRoomInviteToken } from "@/lib/event-room-invite-cookie";
import type { RootState } from "@/redux/store";

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
  eventName?: string;
  isEventOver?: boolean;
  children?: React.ReactNode;
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
  formConfig?: EventRoomAccessFormConfig | null;
  communityId?: string | null;
};

type AccessPayload = {
  accessMode?: AccessMode;
  allowed?: boolean;
  reason?: string;
  pending?: boolean;
  gate?: GateHints;
};

type GateStep = "verify" | "details";

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

function parseFormConfig(raw: unknown): EventRoomAccessFormConfig {
  if (!raw || typeof raw !== "object") return {};
  const cfg = raw as Record<string, unknown>;
  return {
    collectName: Boolean(cfg.collectName),
    collectPhone: Boolean(cfg.collectPhone),
    collectTicketId: Boolean(cfg.collectTicketId),
    customQuestion:
      typeof cfg.customQuestion === "string" ? cfg.customQuestion : null,
  };
}

function EventRoomAccessForm({
  eventId,
  eventName,
  isEventOver,
  accessMode,
  gate,
  pending,
  onSuccess,
}: {
  eventId: string;
  eventName?: string;
  isEventOver?: boolean;
  accessMode: AccessMode;
  gate?: GateHints;
  pending?: boolean;
  onSuccess: () => void;
}) {
  const pathname = usePathname();
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const user = useSelector((s: RootState) => s.auth.user);
  const authToken = useSelector((s: RootState) => s.auth.token);

  const signedInEmail =
    isAuthenticated && user?.role !== "VISITOR" && user?.email?.trim()
      ? user.email.trim()
      : "";

  const [step, setStep] = useState<GateStep>(() =>
    signedInEmail || getStoredAccessEmail(eventId) ? "details" : "verify"
  );
  const [email, setEmail] = useState(
    () => signedInEmail || getStoredAccessEmail(eventId) || ""
  );
  const [accessCode, setAccessCode] = useState(
    () => getStoredAccessCode(eventId) ?? ""
  );
  const [answers, setAnswers] = useState({
    name: "",
    phone: "",
    ticketId: "",
    customAnswer: "",
  });
  const [setReminder, setSetReminder] = useState(false);
  const [reminderOffset, setReminderOffset] = useState(15);
  const [signInOpen, setSignInOpen] = useState(false);
  const [communityOpen, setCommunityOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const formConfig = useMemo(
    () => parseFormConfig(gate?.formConfig),
    [gate?.formConfig]
  );

  const persistCredentials = () => {
    if (accessCode.trim()) {
      window.localStorage.setItem(
        accessCodeStorageKey(eventId),
        accessCode.trim()
      );
    }
    if (email.trim()) {
      window.localStorage.setItem(accessEmailStorageKey(eventId), email.trim());
    }
  };

  const maybeSetReminder = async (verifiedEmail: string) => {
    if (!setReminder || isEventOver) return;
    try {
      if (isAuthenticated && user?.role !== "VISITOR") {
        await setEventReminderAction(
          eventId,
          {
            offsetMinutes: reminderOffset,
            title: eventName ?? "Event reminder",
          },
          authToken
        );
      } else if (verifiedEmail.trim()) {
        const apiBase = (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "").replace(
          /\/$/,
          ""
        );
        await fetch(
          `${apiBase}/events/${encodeURIComponent(eventId)}/reminders`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              offsetMinutes: reminderOffset,
              email: verifiedEmail.trim(),
            }),
          }
        );
      }
    } catch {
      toast.warn("Access granted, but reminder could not be saved.");
    }
  };

  const submit = async () => {
    if (!email.trim() && gate?.requiresEmail) {
      toast.error("Email is required");
      return;
    }
    if (gate?.requiresCode && !accessCode.trim()) {
      toast.error("Access code is required");
      return;
    }

    setBusy(true);
    try {
      const answersJson =
        formConfig.collectName ||
        formConfig.collectPhone ||
        formConfig.collectTicketId ||
        formConfig.customQuestion
          ? {
              ...(formConfig.collectName && answers.name.trim()
                ? { name: answers.name.trim() }
                : {}),
              ...(formConfig.collectPhone && answers.phone.trim()
                ? { phone: answers.phone.trim() }
                : {}),
              ...(formConfig.collectTicketId && answers.ticketId.trim()
                ? { ticketId: answers.ticketId.trim() }
                : {}),
              ...(formConfig.customQuestion && answers.customAnswer.trim()
                ? { customAnswer: answers.customAnswer.trim() }
                : {}),
            }
          : undefined;

      const res = await submitEventRoomAccessAction(eventId, {
        accessCode: gate?.requiresCode ? accessCode.trim() : undefined,
        email: gate?.requiresEmail ? email.trim() : undefined,
        answersJson,
      });
      if (!res.success || !res.data) {
        toast.error(res.message ?? "Could not verify access");
        return;
      }
      const data = res.data as AccessPayload;
      if (data.allowed) {
        persistCredentials();
        await maybeSetReminder(email.trim());
        onSuccess();
        return;
      }
      if (data.pending) {
        persistCredentials();
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

  if (step === "verify") {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-md flex-col justify-center gap-6 px-4 py-10">
        <div className="space-y-2 text-center">
          <Lock className="text-muted-foreground mx-auto size-10" />
          <h1 className="text-2xl font-semibold">Verify your email</h1>
          <p className="text-muted-foreground text-sm">
            Sign in or verify your email to continue into this event room.
          </p>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gate-verify-email">Email</Label>
            <Input
              id="gate-verify-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <Button
            type="button"
            className="w-full"
            onClick={() => setSignInOpen(true)}
          >
            <Mail className="mr-2 size-4" />
            Verify email
          </Button>
          {signedInEmail ? (
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => {
                setEmail(signedInEmail);
                setStep("details");
              }}
            >
              Continue as {signedInEmail}
            </Button>
          ) : null}
        </div>
        <TipperEmailOtpSignInDialog
          open={signInOpen}
          onOpenChange={setSignInOpen}
          signInTitle="Verify email for event access"
          initialEmail={email.trim() || undefined}
          autoSendCode={Boolean(email.trim())}
          signupSurface="event_room"
          onVerified={() => {
            const verified =
              user?.email?.trim() || email.trim() || signedInEmail;
            if (verified) {
              setEmail(verified);
              window.localStorage.setItem(
                accessEmailStorageKey(eventId),
                verified
              );
            }
            setSignInOpen(false);
            setStep("details");
          }}
        />
      </div>
    );
  }

  if (gate?.requiresCommunityMembership) {
    const communityId = gate.communityId?.trim();
    if (!communityId) {
      return <PrivateEventRoomBlocked accessMode={accessMode} />;
    }
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-md flex-col justify-center gap-6 px-4 py-10">
        <div className="space-y-2 text-center">
          <Lock className="text-muted-foreground mx-auto size-10" />
          <h1 className="text-2xl font-semibold">Community members only</h1>
          <p className="text-muted-foreground text-sm">
            Join the host&apos;s community to access this event room.
          </p>
        </div>
        <Button
          type="button"
          className="w-full"
          onClick={() => setCommunityOpen(true)}
        >
          Join community
        </Button>
        <JoinCommunityModal
          open={communityOpen}
          onOpenChange={setCommunityOpen}
          communityId={communityId}
          signInRedirectPath={`${pathname}?communityJoin=1`}
          title="Join community to enter"
          onJoined={() => {
            setCommunityOpen(false);
            onSuccess();
          }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div className="space-y-2 text-center">
        <Lock className="text-muted-foreground mx-auto size-10" />
        <h1 className="text-2xl font-semibold">Event room access</h1>
        <p className="text-muted-foreground text-sm">
          {gate?.requiresCode
            ? "Enter the access code and your details."
            : "Complete the form to request access."}
        </p>
      </div>

      <div className="space-y-4">
        {gate?.requiresEmail ? (
          <div className="space-y-2">
            <Label htmlFor="event-access-email">Email</Label>
            <Input
              id="event-access-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              readOnly={Boolean(signedInEmail)}
            />
          </div>
        ) : null}

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

        {formConfig.collectName ? (
          <div className="space-y-2">
            <Label htmlFor="event-access-name">Name</Label>
            <Input
              id="event-access-name"
              value={answers.name}
              onChange={e =>
                setAnswers(prev => ({ ...prev, name: e.target.value }))
              }
            />
          </div>
        ) : null}

        {formConfig.collectPhone ? (
          <div className="space-y-2">
            <Label htmlFor="event-access-phone">Phone</Label>
            <Input
              id="event-access-phone"
              value={answers.phone}
              onChange={e =>
                setAnswers(prev => ({ ...prev, phone: e.target.value }))
              }
            />
          </div>
        ) : null}

        {formConfig.collectTicketId ? (
          <div className="space-y-2">
            <Label htmlFor="event-access-ticket">Ticket ID</Label>
            <Input
              id="event-access-ticket"
              value={answers.ticketId}
              onChange={e =>
                setAnswers(prev => ({ ...prev, ticketId: e.target.value }))
              }
            />
          </div>
        ) : null}

        {formConfig.customQuestion ? (
          <div className="space-y-2">
            <Label htmlFor="event-access-custom">
              {formConfig.customQuestion}
            </Label>
            <Input
              id="event-access-custom"
              value={answers.customAnswer}
              onChange={e =>
                setAnswers(prev => ({
                  ...prev,
                  customAnswer: e.target.value,
                }))
              }
            />
          </div>
        ) : null}

        {!isEventOver ? (
          <div className="space-y-2 rounded-md border p-3">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={setReminder}
                onCheckedChange={v => setSetReminder(Boolean(v))}
              />
              <Bell className="size-3.5" />
              Remind me before the event
            </label>
            {setReminder ? (
              <select
                className="border-input bg-background w-full rounded-md border px-2 py-1.5 text-sm"
                value={reminderOffset}
                onChange={e => setReminderOffset(Number(e.target.value))}
              >
                <option value={15}>15 minutes before</option>
                <option value={30}>30 minutes before</option>
              </select>
            ) : null}
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

export function EventRoomAccessGate({
  eventId,
  eventName,
  isEventOver,
  children,
}: Props) {
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
        eventName={eventName}
        isEventOver={isEventOver}
        accessMode={accessMode}
        gate={gate}
        pending={pending}
        onSuccess={() => void refreshAccess()}
      />
    );
  }

  return <>{children}</>;
}
