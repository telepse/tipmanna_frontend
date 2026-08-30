import {
  setPendingPushOptIn,
  shouldDeferPushUntilInstalled,
} from "@/lib/pending-push-opt-in";
import { requestPwaPrompt } from "@/lib/pwa-install-trigger";
import { isIosSafariNonStandalone } from "@/lib/pwa-utils";

/** True when push must wait for PWA install (iOS Safari tab). */
export function mustInstallBeforePush(): boolean {
  return shouldDeferPushUntilInstalled() || isIosSafariNonStandalone();
}

/** Defer push opt-in and open install sheet. Returns true if deferred. */
export function deferPushUntilInstalled(source: string): boolean {
  if (!mustInstallBeforePush()) return false;
  setPendingPushOptIn(source);
  requestPwaPrompt("engagement");
  return true;
}

export function pushOptInPrimaryButtonLabel(options?: {
  loading?: boolean;
  needsSignIn?: boolean;
  iosInstallFirst?: boolean;
}): string {
  if (options?.loading) return "Enabling…";
  if (options?.needsSignIn) return "Sign in to enable";
  if (options?.iosInstallFirst ?? mustInstallBeforePush()) {
    return "Add to Home Screen";
  }
  return "Turn on notifications";
}
