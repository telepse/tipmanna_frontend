"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Local imports
import { AlreadySignedInNotice } from "@/components/auth/already-signed-in-notice";
import { SigninForm } from "./signin-form";
import { useSelector } from "react-redux";
import type { RootState } from "@/redux/store";

import type { SignupSurface } from "@/lib/signup-attribution";

export type SignInModalPayload = {
  role: "HOST" | "TIPPER";
  username?: string;
  eventSlug?: string | null;
};

type SignInDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  /** Preferred return path after auth (also pass ?next= on /sign-in for full page). */
  returnTo?: string | null;
  /** Default tab in modal — use tipper for dedicated community / Explore flows. */
  defaultUserType?: "host" | "tipper";
  onSuccess?: (payload: SignInModalPayload) => void;
  /** Raise above parent modals (create dialog, comment drawer). */
  overlayClassName?: string;
  contentClassName?: string;
  allowInlineSignUp?: boolean;
  /** Shows a banner directing users to the Host creator tab. */
  hostRequiredNotice?: boolean;
  /**
   * When false, the parent closes the modal from onSuccess.
   * Avoids racing create-dialog resume (picker flash).
   */
  closeOnSuccess?: boolean;
  /** Hide the already-signed-in banner (create-dialog auth must not flash it). */
  showSignedInNotice?: boolean;
  /** Analytics: UI surface that opened this sign-in flow. */
  signupSurface: SignupSurface;
};

/**
 * Modal sign-in; avoids full-page /sign-in navigation for explore / side-chick flows.
 * Tipper email-code flow still redirects to /verify-email with `returnTo` preserved when possible.
 */
export default function SignInDialog({
  open,
  onOpenChange,
  title = "Sign in",
  returnTo = null,
  defaultUserType = "host",
  onSuccess,
  overlayClassName,
  contentClassName,
  allowInlineSignUp = false,
  hostRequiredNotice = false,
  closeOnSuccess = true,
  showSignedInNotice,
  signupSurface,
}: SignInDialogProps) {
  const { user, isAuthenticated } = useSelector((s: RootState) => s.auth);
  const resolvedCloseOnSuccess = onSuccess ? false : closeOnSuccess;
  const resolvedShowSignedInNotice =
    showSignedInNotice ?? (onSuccess ? false : true);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent
        overlayClassName={overlayClassName}
        className={`max-h-[80vh] overflow-y-auto sm:max-w-md ${contentClassName ?? ""}`}
        onOpenAutoFocus={e => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {hostRequiredNotice ? (
          <div
            role="alert"
            className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
          >
            This action requires your host creator account — use the Host
            creator tab below.
          </div>
        ) : null}

        {resolvedShowSignedInNotice && isAuthenticated && user ? (
          <AlreadySignedInNotice compact />
        ) : null}

        <SigninForm
          key={open ? "open" : "closed"}
          mode="modal"
          returnTo={returnTo}
          defaultUserType={defaultUserType}
          allowInlineSignUp={allowInlineSignUp}
          signupSurface={signupSurface}
          onModalHostSuccess={payload => {
            onSuccess?.(payload);
            if (resolvedCloseOnSuccess) onOpenChange(false);
          }}
          onModalTipperSuccess={payload => {
            onSuccess?.(payload);
            if (resolvedCloseOnSuccess) onOpenChange(false);
          }}
          className="py-4"
        />
      </DialogContent>
    </Dialog>
  );
}
