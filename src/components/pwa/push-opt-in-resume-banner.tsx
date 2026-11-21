"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Bell, X } from "lucide-react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import { usePushPermission } from "@/hooks/use-push-permission";
import { useInstallPrompt } from "@/hooks/use-install-prompt";
import { ensurePushForSignedInTipper } from "@/lib/program-push-setup";
import {
  clearPendingPushOptIn,
  readPendingPushOptIn,
  shouldDeferPushUntilInstalled,
} from "@/lib/pending-push-opt-in";
import { fetchPushPromptPolicy } from "@/lib/pwa-install-trigger";
import { isVenueChromeSuppressedPath } from "@/lib/watch-portal-flag";
import type { RootState } from "@/redux/store";

/** Tap-to-enable banner after iOS PWA install (Web Push requires user gesture). */
export function PushOptInResumeBanner() {
  const pathname = usePathname() ?? "";
  const { installed } = useInstallPrompt();
  const { state, subscribe, loading } = usePushPermission();
  const authToken = useSelector((s: RootState) => s.auth.token);
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isVenueChromeSuppressedPath(pathname)) {
      setVisible(false);
      return;
    }
    if (!installed || !isAuthenticated || !authToken) {
      setVisible(false);
      return;
    }
    if (shouldDeferPushUntilInstalled()) {
      setVisible(false);
      return;
    }
    setVisible(Boolean(readPendingPushOptIn()));
  }, [authToken, installed, isAuthenticated, pathname]);

  if (
    isVenueChromeSuppressedPath(pathname) ||
    !visible ||
    state === "subscribed" ||
    state === "unsupported"
  ) {
    return null;
  }

  const dismiss = () => {
    clearPendingPushOptIn();
    setVisible(false);
  };

  const finishEnable = async () => {
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
      if (result === "push_enabled" || result === "already_subscribed") {
        clearPendingPushOptIn();
        setVisible(false);
        toast.success("Push notifications enabled");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Finish enabling notifications"
      className="border-primary/30 bg-primary/5 fixed right-4 bottom-20 left-4 z-[12900] flex items-start gap-3 rounded-xl border p-3 shadow-lg sm:left-auto sm:max-w-sm"
    >
      <Bell
        className="text-primary mt-0.5 size-5 shrink-0"
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Finish enabling notifications</p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          Tap below to turn on push alerts now that Tipmanna is installed.
        </p>
        <div className="mt-2 flex gap-2">
          <Button
            type="button"
            size="sm"
            className="bg-black"
            disabled={busy || loading}
            onClick={() => void finishEnable()}
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
  );
}
