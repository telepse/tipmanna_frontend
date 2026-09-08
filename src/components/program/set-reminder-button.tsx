"use client";

import { useState } from "react";

// Third-party imports
import { useSelector } from "react-redux";
import { Bell, Check, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// Local imports
import { setProgramReminderAction } from "@/actions/program-actions";
import { GuestReminderPushOffer } from "@/components/program/guest-reminder-push-offer";
import { usePushPermission } from "@/hooks/use-push-permission";
import {
  ensurePushForSignedInTipper,
  hasBackendPushSubscription,
} from "@/lib/program-push-setup";
import {
  deferPushUntilInstalled,
  pushOptInPrimaryButtonLabel,
} from "@/lib/push-opt-in-ios";
import { fetchPushPromptPolicy } from "@/lib/pwa-install-trigger";
import type { RootState } from "@/redux/store";
import { TipperEmailOtpSignInDialog } from "@/components/auth/tipper-email-otp-sign-in-dialog";

const OFFSET_LABELS: Record<number, string> = {
  5: "5 minutes before",
  15: "15 minutes before",
  30: "30 minutes before",
  60: "1 hour before",
  1440: "1 day before",
};

export function SetReminderButton({
  programTitle,
  scheduledAt,
  offsetOptions,
  defaultOffset,
  enforcementId,
  globalEnforcementId,
  communityId,
}: {
  programTitle: string;
  scheduledAt: string;
  offsetOptions: number[];
  defaultOffset: number;
  enforcementId?: string;
  globalEnforcementId?: string;
  communityId?: string;
}) {
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const user = useSelector((s: RootState) => s.auth.user);
  const authToken = useSelector((s: RootState) => s.auth.token);
  const { subscribe, state: pushState } = usePushPermission();

  const [open, setOpen] = useState(false);
  const [tipperSignInOpen, setTipperSignInOpen] = useState(false);
  const [offset, setOffset] = useState(defaultOffset);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [pushOfferOpen, setPushOfferOpen] = useState(false);
  const [authPushPromptOpen, setAuthPushPromptOpen] = useState(false);
  const [guestEmailUsed, setGuestEmailUsed] = useState("");
  const [guestPushFlowActive, setGuestPushFlowActive] = useState(false);

  const postId = globalEnforcementId ?? enforcementId;
  const needsEmail = !isAuthenticated || user?.role === "VISITOR";

  const apiBase = () =>
    (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "").replace(/\/$/, "");

  const handleAuthenticatedPushPrompt = async () => {
    if (deferPushUntilInstalled("set-reminder")) {
      setAuthPushPromptOpen(false);
      toast.info("Install Tipmanna first, then we will enable push reminders.");
      return;
    }
    const policy = await fetchPushPromptPolicy();
    if (!policy.enabled) {
      setAuthPushPromptOpen(false);
      toast.info("Push notifications are not available right now.");
      return;
    }
    const result = await ensurePushForSignedInTipper({
      pushState,
      subscribe,
      token: authToken,
    });
    setAuthPushPromptOpen(false);
    if (result === "already_subscribed" || result === "push_enabled") {
      toast.success("Push reminder set for this program.");
    } else {
      toast.info(
        "Reminder saved. Enable push from your profile alerts tab when ready."
      );
    }
  };

  const isProgramOver = new Date() > new Date(scheduledAt);

  const setReminder = async () => {
    if (!postId) {
      toast.error("This program cannot accept reminders yet.");
      return;
    }

    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        offsetMinutes: offset,
        scheduledAt,
        title: programTitle,
        body: `${programTitle} starts soon.`,
      };
      if (enforcementId) body.enforcementId = enforcementId;
      if (globalEnforcementId) body.globalEnforcementId = globalEnforcementId;
      if (communityId) body.communityId = communityId;

      if (isAuthenticated && user?.role !== "VISITOR") {
        const res = await setProgramReminderAction(postId, body);
        if (!res.success) {
          throw new Error(res.message ?? "Failed to set reminder");
        }

        const alreadyPush =
          pushState === "subscribed" &&
          (await hasBackendPushSubscription(authToken));
        if (alreadyPush) {
          toast.success("Reminder set with push alerts.");
        } else {
          setAuthPushPromptOpen(true);
        }
      } else {
        if (!email.trim()) {
          throw new Error("Email is required for guest reminders");
        }
        body.email = email.trim();
        const res = await fetch(
          `${apiBase()}/reminder-bucket/posts/${encodeURIComponent(postId)}/set-reminder`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(
            (err as { message?: string }).message ?? `Failed (${res.status})`
          );
        }
        setGuestEmailUsed(email.trim());
        setGuestPushFlowActive(true);
        setPushOfferOpen(true);
        toast.success("Reminder set");
      }

      setDone(true);
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not set reminder");
    } finally {
      setBusy(false);
    }
  };

  const showGuestPushOffer =
    Boolean(guestEmailUsed) && guestPushFlowActive && pushOfferOpen;

  return (
    <>
      {done ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled
        >
          <Check />
          Reminder set
        </Button>
      ) : (
        <div className="relative w-full rounded-md border shadow-md sm:w-fit">
          <Button
            type="button"
            variant="outline"
            className={cn(
              isProgramOver
                ? "bg-gray-300 text-gray-500"
                : "outline-primary outline",
              "w-full sm:w-fit"
            )}
            size="sm"
            disabled={isProgramOver || !postId}
            onClick={() => {
              if (needsEmail) {
                setTipperSignInOpen(true);
                return;
              }
              setOpen(v => !v);
            }}
          >
            👍🏽 yes, i will watch this program
          </Button>

          {open ? (
            <div className="absolute bottom-full left-0 z-[100030000] max-h-[320px] w-72 space-y-2 overflow-y-auto rounded-md border bg-white p-4 shadow-md">
              <p className="text-sm font-medium">Remind me</p>

              <div className="space-y-1">
                {offsetOptions.map(min => (
                  <label
                    key={min}
                    className="hover:bg-muted flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm"
                  >
                    <input
                      type="radio"
                      name="reminder-offset"
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
                  placeholder="Email (guest)"
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

      {showGuestPushOffer ? (
        <GuestReminderPushOffer
          email={guestEmailUsed}
          open={pushOfferOpen}
          onOpenChange={open => {
            setPushOfferOpen(open);
            if (!open) setGuestPushFlowActive(false);
          }}
          onComplete={() => {
            setGuestPushFlowActive(false);
            setPushOfferOpen(false);
          }}
        />
      ) : null}

      <Dialog
        open={authPushPromptOpen}
        onOpenChange={setAuthPushPromptOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="size-5" />
              Enable push for this program?
            </DialogTitle>
            <DialogDescription>
              Your reminder is saved. Turn on push alerts on this device to get
              notified before the program starts.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              className="bg-black"
              onClick={() => void handleAuthenticatedPushPrompt()}
            >
              {pushOptInPrimaryButtonLabel()}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setAuthPushPromptOpen(false)}
            >
              Email & in-app only
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <TipperEmailOtpSignInDialog
        open={tipperSignInOpen}
        onOpenChange={setTipperSignInOpen}
        signInTitle="Sign in to set program reminders"
        signupSurface="reminder"
        onVerified={() => {
          setTipperSignInOpen(false);
          setOpen(true);
        }}
      />
    </>
  );
}
