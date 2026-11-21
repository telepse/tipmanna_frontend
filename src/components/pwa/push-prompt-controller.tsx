"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import { TipperEmailOtpSignInDialog } from "@/components/auth/tipper-email-otp-sign-in-dialog";
import { usePushPermission } from "@/hooks/use-push-permission";
import { useInstallPrompt } from "@/hooks/use-install-prompt";
import { ensurePushForSignedInTipper } from "@/lib/program-push-setup";
import { usePathname } from "next/navigation";

import { fetchPushPromptPolicy } from "@/lib/pwa-install-trigger";
import { isVenueChromeSuppressedPath } from "@/lib/watch-portal-flag";
import type { RootState } from "@/redux/store";

const DISMISS_SESSION_KEY = "tipmanna_push_prompt_dismissed_session";

function dismissedThisSession(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(DISMISS_SESSION_KEY) === "1";
}

function markDismissedThisSession(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(DISMISS_SESSION_KEY, "1");
}

/** Session push opt-in prompt for installed PWA users without push subscription. */
export function PushPromptController() {
  const pathname = usePathname() ?? "";
  const { installed } = useInstallPrompt();
  const { state, detecting, loading, subscribe } = usePushPermission();
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const requiresVerification = useSelector(
    (s: RootState) => s.auth.requiresVerification
  );
  const authToken = useSelector((s: RootState) => s.auth.token);
  const [visible, setVisible] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isVenueChromeSuppressedPath(pathname)) {
      setVisible(false);
      return;
    }
    if (detecting || dismissedThisSession()) {
      setVisible(false);
      return;
    }
    if (
      !installed ||
      state === "unsupported" ||
      state === "denied" ||
      state === "subscribed"
    ) {
      setVisible(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      const policy = await fetchPushPromptPolicy();
      if (cancelled) return;
      setVisible(policy.enabled);
    })();

    return () => {
      cancelled = true;
    };
  }, [detecting, installed, pathname, state]);

  if (!visible) return null;

  const dismiss = () => {
    markDismissedThisSession();
    setVisible(false);
  };

  const runPushSubscribe = async () => {
    setBusy(true);
    try {
      const policy = await fetchPushPromptPolicy();
      if (!policy.enabled) {
        dismiss();
        toast.info("Push notifications are not available right now.");
        return;
      }
      const result = await ensurePushForSignedInTipper({
        pushState: state,
        subscribe,
        token: authToken,
      });
      if (result === "already_subscribed" || result === "push_enabled") {
        dismiss();
        toast.success("Push notifications enabled");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleEnable = async () => {
    if (!isAuthenticated || requiresVerification) {
      setSignInOpen(true);
      return;
    }
    await runPushSubscribe();
  };

  const handleVerified = async () => {
    await runPushSubscribe();
  };

  return (
    <>
      <div
        role="dialog"
        aria-label="Enable push notifications"
        className="border-primary/30 bg-primary/5 fixed right-4 bottom-20 left-4 z-[12900] flex items-start gap-3 rounded-xl border p-3 shadow-lg sm:left-auto sm:max-w-sm"
      >
        <Bell
          className="text-primary mt-0.5 size-5 shrink-0"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Enable push notifications</p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Get reminders and updates when hosts you follow go live.
          </p>
          <div className="mt-2 flex gap-2">
            <Button
              type="button"
              size="sm"
              className="bg-black"
              disabled={busy || loading}
              onClick={() => void handleEnable()}
            >
              {busy || loading ? "Enabling…" : "Turn on notifications"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={dismiss}
            >
              Not now
            </Button>
          </div>
        </div>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground shrink-0 rounded p-1"
          aria-label="Dismiss"
          onClick={dismiss}
        >
          <X className="size-4" />
        </button>
      </div>

      <TipperEmailOtpSignInDialog
        open={signInOpen}
        onOpenChange={setSignInOpen}
        signInTitle="Sign in to enable push alerts"
        signupSurface="push_prompt"
        onVerified={handleVerified}
      />
    </>
  );
}
