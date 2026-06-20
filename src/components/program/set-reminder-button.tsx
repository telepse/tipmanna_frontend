"use client";

import { useState } from "react";
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
import { setProgramReminderAction } from "@/actions/program-actions";
import { GuestReminderPushOffer } from "@/components/program/guest-reminder-push-offer";
import { usePushPermission } from "@/hooks/use-push-permission";
import {
  ensurePushForSignedInTipper,
  hasBackendPushSubscription,
} from "@/lib/program-push-setup";
import type { RootState } from "@/redux/store";
import { cn } from "@/lib/utils";

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
  const requiresVerification = useSelector(
    (s: RootState) => s.auth.requiresVerification
  );
  const authToken = useSelector((s: RootState) => s.auth.token);
  const { subscribe, state: pushState } = usePushPermission();

  const [open, setOpen] = useState(false);
  const [offset, setOffset] = useState(defaultOffset);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [pushOfferOpen, setPushOfferOpen] = useState(false);
  const [authPushPromptOpen, setAuthPushPromptOpen] = useState(false);
  const [guestEmailUsed, setGuestEmailUsed] = useState("");
  const [guestPushFlowActive, setGuestPushFlowActive] = useState(false);

  const apiBase = () =>
    (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "").replace(/\/$/, "");

  const postId = globalEnforcementId ?? enforcementId ?? "program";

  const handleAuthenticatedPushPrompt = async () => {
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

      if (isAuthenticated) {
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
      }

      setDone(true);
      if (!isAuthenticated) {
        toast.success("Reminder set");
      }
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not set reminder");
    } finally {
      setBusy(false);
    }
  };

  const showGuestPushOffer =
    guestEmailUsed &&
    guestPushFlowActive &&
    (!isAuthenticated || requiresVerification);

  if (done) {
    return (
      <>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled
        >
          <Check className="mr-1 size-4" />
          Reminder set
        </Button>

        {showGuestPushOffer ? (
          <GuestReminderPushOffer
            email={guestEmailUsed}
            open={pushOfferOpen}
            onOpenChange={open => {
              setPushOfferOpen(open);
              if (!open) setGuestPushFlowActive(false);
            }}
            onComplete={() => setGuestPushFlowActive(false)}
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
                Your reminder is saved. Turn on push alerts on this device to
                get notified before the program starts.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                className="bg-black"
                onClick={() => void handleAuthenticatedPushPrompt()}
              >
                Enable push alerts
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
      </>
    );
  }

  return (
    <div className="relative w-full rounded-lg border sm:w-fit">
      <Button
        type="button"
        variant="outline"
        // className="bg-primary w-full text-white sm:w-fit"
        className={cn(
          isProgramOver ? "bg-gray-300 text-gray-500" : "bg-primary text-white",
          "w-full sm:w-fit"
        )}
        size="sm"
        disabled={isProgramOver}
        onClick={() => setOpen(v => !v)}
      >
        <Bell className="mr-1 size-4" />
        Set reminder
      </Button>
      {open ? (
        <div className="absolute bottom-full left-0 z-[100030000] mt-2 max-h-[320px] w-72 overflow-y-auto rounded-lg border bg-white p-3 shadow-lg">
          <p className="mb-2 text-sm font-medium">Remind me</p>
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
          {!isAuthenticated ? (
            <Input
              type="email"
              placeholder="Email (guest)"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="mt-3"
            />
          ) : null}
          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={() => void setReminder()}
            >
              {busy ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
              Confirm
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
