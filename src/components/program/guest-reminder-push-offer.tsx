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
import { TipperEmailOtpSignInDialog } from "@/components/auth/tipper-email-otp-sign-in-dialog";
import { usePushPermission } from "@/hooks/use-push-permission";
import { completeGuestProgramPushSetup } from "@/lib/program-push-setup";
import { store } from "@/redux/store";
import type { RootState } from "@/redux/store";

type Props = {
  email: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
};

export function GuestReminderPushOffer({
  email,
  open,
  onOpenChange,
  onComplete,
}: Props) {
  const authToken = useSelector((s: RootState) => s.auth.token);
  const { subscribe, state: pushState } = usePushPermission();
  const [otpOpen, setOtpOpen] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);

  const handleEnablePush = () => {
    onOpenChange(false);
    setConsentOpen(true);
  };

  const handleConsentContinue = () => {
    setConsentOpen(false);
    setOtpOpen(true);
  };

  const handleVerified = async () => {
    const token = store.getState().auth.token ?? authToken;
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
        <DialogContent className="sm:max-w-md">
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
              onClick={() => onOpenChange(false)}
            >
              Email only
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={consentOpen}
        onOpenChange={setConsentOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Verify to enable push</DialogTitle>
            <DialogDescription>
              We will verify <strong>{email}</strong>. If you do not have a
              Tipmanna tipper account yet, we will create one for this email so
              push reminders can reach this device. By continuing you agree to
              the Terms and Privacy Policy.
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
        signInTitle="Verify your email for push alerts"
        onVerified={handleVerified}
      />
    </>
  );
}
