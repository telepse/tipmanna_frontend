"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { Bell } from "lucide-react";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import { TipperEmailOtpSignInDialog } from "@/components/auth/tipper-email-otp-sign-in-dialog";
import { usePushPermission } from "@/hooks/use-push-permission";
import { ensurePushForSignedInTipper } from "@/lib/program-push-setup";
import { isIosSafariNonStandalone } from "@/lib/pwa-utils";
import { fetchPushPromptPolicy } from "@/lib/pwa-install-trigger";
import {
  deferPushUntilInstalled,
  mustInstallBeforePush,
  pushOptInPrimaryButtonLabel,
} from "@/lib/push-opt-in-ios";
import { cn } from "@/lib/utils";
import type { RootState } from "@/redux/store";

interface Props {
  className?: string;
}

export function PushPermissionPrompt({ className }: Props) {
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const requiresVerification = useSelector(
    (s: RootState) => s.auth.requiresVerification
  );
  const authToken = useSelector((s: RootState) => s.auth.token);
  const { state, detecting, loading, error, subscribe } = usePushPermission();
  const iosInstallHint = mustInstallBeforePush();
  const [signInOpen, setSignInOpen] = useState(false);

  if (
    detecting ||
    state === "unsupported" ||
    state === "denied" ||
    state === "subscribed"
  ) {
    return null;
  }

  const runPushSubscribe = async () => {
    const policy = await fetchPushPromptPolicy();
    if (!policy.enabled) {
      toast.info("Push notifications are not available right now.");
      return;
    }
    if (policy.pwaInstalledOnly && isIosSafariNonStandalone()) {
      deferPushUntilInstalled("push-permission-prompt");
      toast.info("Install Tipmanna first, then we will enable notifications.");
      return;
    }
    const result = await ensurePushForSignedInTipper({
      pushState: state,
      subscribe,
      token: authToken,
    });
    if (result === "already_subscribed" || result === "push_enabled") {
      toast.success("Push notifications enabled");
    }
  };

  const handleVerifiedPush = async () => {
    if (deferPushUntilInstalled("push-permission-prompt")) {
      toast.info("Install Tipmanna first, then we will enable notifications.");
      return;
    }
    await runPushSubscribe();
  };

  const handleEnable = async () => {
    if (!isAuthenticated || requiresVerification) {
      setSignInOpen(true);
      return;
    }

    if (deferPushUntilInstalled("push-permission-prompt")) {
      toast.info("Install Tipmanna first, then we will enable notifications.");
      return;
    }

    await runPushSubscribe();
  };

  const needsSignIn = !isAuthenticated || requiresVerification;

  return (
    <>
      <div
        className={cn(
          "border-primary/30 bg-primary/5 mx-2 mb-3 flex items-start gap-3 rounded-lg border p-3",
          className
        )}
      >
        <Bell className="text-primary mt-0.5 size-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Enable push notifications</p>
          <p className="text-muted-foreground mt-1 text-xs">
            Get reminders and updates when hosts you follow go live.
          </p>
          {iosInstallHint ? (
            <p className="text-muted-foreground mt-2 text-xs">
              On iPhone: add Tipmanna to your Home Screen first. Push alerts
              only work in the installed app — not in the Safari tab.
            </p>
          ) : null}
          {error ? (
            <p className="text-destructive mt-1 text-xs">{error}</p>
          ) : null}
          <p className="text-muted-foreground mt-2 text-[11px]">
            No account yet? Continue and we will create a free tipper account
            when you verify.
          </p>
          <Button
            type="button"
            size="sm"
            className="mt-2 bg-black"
            disabled={loading}
            onClick={() => void handleEnable()}
          >
            {pushOptInPrimaryButtonLabel({
              loading,
              needsSignIn,
              iosInstallFirst: iosInstallHint,
            })}
          </Button>
        </div>
      </div>

      <TipperEmailOtpSignInDialog
        open={signInOpen}
        onOpenChange={setSignInOpen}
        signInTitle="Sign in to enable push alerts"
        signupSurface="push_prompt"
        onVerified={handleVerifiedPush}
      />
    </>
  );
}
