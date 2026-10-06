"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { Bell } from "lucide-react";
import { toast } from "react-toastify";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TermsPrivacyLabel } from "@/components/auth/terms-privacy-label";
import { TipperEmailOtpSignInDialog } from "@/components/auth/tipper-email-otp-sign-in-dialog";
import { usePushPermission } from "@/hooks/use-push-permission";
import {
  completeGuestProgramPushSetup,
  mergeGuestProgramRemindersOnly,
} from "@/lib/program-push-setup";
import { deferPushUntilInstalled } from "@/lib/push-opt-in-ios";
import { fetchPushPromptPolicy } from "@/lib/pwa-install-trigger";
import { store } from "@/redux/store";
import type { RootState } from "@/redux/store";
import {
  AUTH_MODAL_OVERLAY_Z_INDEX,
  AUTH_MODAL_Z_INDEX,
} from "@/lib/drawer-z-index";

type Flow = "push" | "in_app";

type Props = {
  email: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
  stackModalsAboveDrawer?: boolean;
};

export function GuestReminderPushOffer({
  email,
  open,
  onOpenChange,
  onComplete,
  stackModalsAboveDrawer = false,
}: Props) {
  const authToken = useSelector((s: RootState) => s.auth.token);
  const modalOverlayClass = stackModalsAboveDrawer
    ? AUTH_MODAL_OVERLAY_Z_INDEX
    : undefined;
  const modalContentClass = stackModalsAboveDrawer
    ? AUTH_MODAL_Z_INDEX
    : undefined;
  const { subscribe, state: pushState } = usePushPermission();
  const [otpOpen, setOtpOpen] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const [flow, setFlow] = useState<Flow>("push");

  const handleEnablePush = () => {
    setFlow("push");
    onOpenChange(false);
    setConsentOpen(true);
  };

  const handleEmailInApp = () => {
    setFlow("in_app");
    onOpenChange(false);
    setConsentOpen(true);
  };

  const handleConsentContinue = () => {
    setConsentOpen(false);
    setOtpOpen(true);
  };

  const handleVerified = async () => {
    const token = store.getState().auth.token ?? authToken;

    if (flow === "in_app") {
      const ok = await mergeGuestProgramRemindersOnly({ email, token });
      if (ok) {
        toast.success("Email and in-app reminders linked to your account.");
      } else {
        toast.warn(
          "Reminder saved, but we could not link it to your account. Try again from your profile."
        );
      }
      onComplete?.();
      setOtpOpen(false);
      return;
    }

    if (deferPushUntilInstalled("guest-reminder")) {
      toast.info("Install Tipmanna first, then we will enable push reminders.");
      onComplete?.();
      setOtpOpen(false);
      return;
    }
    const policy = await fetchPushPromptPolicy();
    if (!policy.enabled) {
      onComplete?.();
      setOtpOpen(false);
      return;
    }

    const result = await completeGuestProgramPushSetup({
      email,
      token,
      pushState,
      subscribe,
    });

    if (result === "merge_failed") {
      toast.warn(
        "Reminder saved, but we could not link it to your account for push. Try again or use email only."
      );
      return;
    }

    if (result === "already_subscribed" || result === "push_enabled") {
      toast.success("Push reminder set for this program.");
    } else {
      toast.info(
        "Account verified. You can enable push from your profile alerts tab."
      );
    }

    onComplete?.();
    setOtpOpen(false);
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={onOpenChange}
      >
        <DialogContent
          overlayClassName={modalOverlayClass}
          className={
            modalContentClass
              ? `${modalContentClass} sm:max-w-md`
              : "sm:max-w-md"
          }
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="size-5" />
              Reminder set
            </DialogTitle>
            <DialogDescription>
              You will get an email before the program starts. Want a push alert
              on this device too?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              className="bg-black"
              onClick={() => void handleEnablePush()}
            >
              Enable push alerts
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={handleEmailInApp}
            >
              Email + in-app
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={consentOpen}
        onOpenChange={setConsentOpen}
      >
        <DialogContent
          overlayClassName={modalOverlayClass}
          className={
            modalContentClass
              ? `${modalContentClass} sm:max-w-md`
              : "sm:max-w-md"
          }
        >
          <DialogHeader>
            <DialogTitle>
              {flow === "push"
                ? "Verify to enable push"
                : "Verify for in-app reminders"}
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <span>
                We will verify <strong>{email}</strong>. If you do not have a
                Tipmanna tipper account yet, we will create one for this email
                {flow === "push"
                  ? " so push reminders can reach this device."
                  : " so in-app reminders appear in your account."}
              </span>
              <TermsPrivacyLabel />
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              className="bg-black"
              onClick={handleConsentContinue}
            >
              Continue
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConsentOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <TipperEmailOtpSignInDialog
        open={otpOpen}
        onOpenChange={setOtpOpen}
        initialEmail={email}
        autoSendCode
        signupSurface="reminder"
        overlayClassName={modalOverlayClass}
        contentClassName={modalContentClass}
        signInTitle={
          flow === "push"
            ? "Verify your email for push alerts"
            : "Verify your email for in-app reminders"
        }
        onVerified={() => void handleVerified()}
      />
    </>
  );
}
