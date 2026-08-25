"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Bell, Check, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  getMyEventReminderAction,
  mergeSubscriberEventRemindersAction,
  setEventReminderAction,
} from "@/actions/event-reminders";
import { EventReminderChoiceDialog } from "@/components/events/event-reminder-choice-dialog";
import { usePushPermission } from "@/hooks/use-push-permission";
import { ensurePushForSignedInTipper } from "@/lib/program-push-setup";
import { store } from "@/redux/store";
import type { RootState } from "@/redux/store";
import { TipperEmailOtpSignInDialog } from "@/components/auth/tipper-email-otp-sign-in-dialog";

const OFFSET_LABELS: Record<number, string> = {
  5: "5 minutes before",
  15: "15 minutes before",
  30: "30 minutes before",
  60: "1 hour before",
  1440: "1 day before",
};

const OFFSET_OPTIONS = [5, 15, 30, 60, 1440];

type Props = {
  eventId: string;
  eventName: string;
  isEventOver: boolean;
  className?: string;
};

export function EventSetReminderButton({
  eventId,
  eventName,
  isEventOver,
  className,
}: Props) {
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const user = useSelector((s: RootState) => s.auth.user);
  const authToken = useSelector((s: RootState) => s.auth.token);
  const { subscribe, state: pushState } = usePushPermission();

  const [open, setOpen] = useState(false);
  const [offset, setOffset] = useState(15);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [guestEmailUsed, setGuestEmailUsed] = useState("");
  const [tipperSignInOpen, setTipperSignInOpen] = useState(false);
  const [pendingGuestMerge, setPendingGuestMerge] = useState(false);

  const needsEmail = !isAuthenticated || user?.role === "VISITOR";
  const isGuestFlow = Boolean(guestEmailUsed) && !isAuthenticated;

  useEffect(() => {
    if (!eventId || isEventOver) return;
    void getMyEventReminderAction(eventId).then(res => {
      if (res.success && res.data?.hasReminder) setDone(true);
    });
  }, [eventId, isEventOver]);

  const apiBase = () =>
    (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "").replace(/\/$/, "");

  const setReminder = async () => {
    setBusy(true);
    try {
      if (isAuthenticated && user?.role !== "VISITOR") {
        const res = await setEventReminderAction(
          eventId,
          { offsetMinutes: offset, title: eventName },
          authToken
        );
        if (!res.success) throw new Error(res.message ?? "Failed");
        setDone(true);
        setOpen(false);
        setChoiceOpen(true);
      } else {
        if (!email.trim()) throw new Error("Email is required");
        const res = await fetch(
          `${apiBase()}/events/${encodeURIComponent(eventId)}/reminders`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              offsetMinutes: offset,
              email: email.trim(),
            }),
          }
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(
            (err as { message?: string }).message ?? `Failed (${res.status})`
          );
        }
        setGuestEmailUsed(email.trim());
        setDone(true);
        setOpen(false);
        setChoiceOpen(true);
        toast.success("Reminder set");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not set reminder");
    } finally {
      setBusy(false);
    }
  };

  const handleGuestVerified = async () => {
    const token = store.getState().auth.token ?? authToken;
    const res = await mergeSubscriberEventRemindersAction(
      { email: guestEmailUsed },
      token
    );
    setTipperSignInOpen(false);
    setChoiceOpen(false);
    setPendingGuestMerge(false);

    if (res.success) {
      toast.success("Email and in-app reminders linked to your account.");
    } else {
      toast.warn(
        "Reminder saved, but we could not link it to your account. Try again from your profile."
      );
    }
  };

  const handleEnablePush = async () => {
    if (isGuestFlow) {
      setPendingGuestMerge(true);
      setTipperSignInOpen(true);
      return;
    }
    const result = await ensurePushForSignedInTipper({
      pushState,
      subscribe,
      token: authToken,
    });
    if (result === "already_subscribed" || result === "push_enabled") {
      toast.success("Push reminder enabled for this event.");
    }
    setChoiceOpen(false);
  };

  const handleEmailInAppOnly = async () => {
    if (isGuestFlow) {
      setPendingGuestMerge(true);
      setTipperSignInOpen(true);
      return;
    }
    toast.info("Email and in-app reminders are saved for this event.");
    setChoiceOpen(false);
  };

  return (
    <>
      {done ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled
          className={className}
        >
          <Check className="size-3" />
          Reminder set
        </Button>
      ) : (
        <div className={cn("relative", className)}>
          <button
            type="button"
            disabled={isEventOver}
            className={cn(
              "outline-primary flex w-fit cursor-pointer items-center gap-1 rounded-md bg-white px-2 py-1 text-[10px] whitespace-nowrap text-black outline hover:bg-white/80 sm:text-sm",
              isEventOver && "cursor-not-allowed opacity-50"
            )}
            onClick={() => setOpen(v => !v)}
          >
            <Bell className="size-3 shrink-0" /> Set reminder
          </button>
          {open ? (
            <div className="absolute top-full right-0 z-[100030000] mt-1 w-72 space-y-2 rounded-md border bg-white p-3 shadow-md">
              <p className="text-sm font-medium">Remind me</p>
              <div className="space-y-1">
                {OFFSET_OPTIONS.map(min => (
                  <label
                    key={min}
                    className="hover:bg-muted flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm"
                  >
                    <input
                      type="radio"
                      name="event-reminder-offset"
                      checked={offset === min}
                      onChange={() => setOffset(min)}
                    />
                    {OFFSET_LABELS[min] ?? `${min} min before`}
                  </label>
                ))}
              </div>
              {needsEmail ? (
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              ) : null}
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={busy}
                  onClick={() => void setReminder()}
                >
                  {busy ? <Loader2 className="animate-spin" /> : null}
                  Confirm
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      <EventReminderChoiceDialog
        open={choiceOpen}
        onOpenChange={setChoiceOpen}
        email={guestEmailUsed || user?.email || ""}
        isGuestFlow={isGuestFlow}
        onEnablePush={() => void handleEnablePush()}
        onEmailInAppOnly={() => void handleEmailInAppOnly()}
      />

      <TipperEmailOtpSignInDialog
        open={tipperSignInOpen}
        onOpenChange={open => {
          setTipperSignInOpen(open);
          if (!open) setPendingGuestMerge(false);
        }}
        initialEmail={guestEmailUsed}
        autoSendCode
        signInTitle={
          pendingGuestMerge
            ? "Sign in for in-app event reminders"
            : "Sign in for in-app event reminders"
        }
        onVerified={() => {
          if (pendingGuestMerge && guestEmailUsed) {
            void handleGuestVerified();
            return;
          }
          if (pushState !== "subscribed") {
            void ensurePushForSignedInTipper({
              pushState,
              subscribe,
              token: store.getState().auth.token ?? authToken,
            }).then(result => {
              if (
                result === "push_enabled" ||
                result === "already_subscribed"
              ) {
                toast.success("Push reminder enabled for this event.");
              }
            });
          }
          setChoiceOpen(false);
        }}
      />
    </>
  );
}
