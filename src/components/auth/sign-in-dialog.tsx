"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Local imports
import { SigninForm } from "./signin-form";

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
}: SignInDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent
        overlayClassName={overlayClassName}
        className={`max-h-[80vh] overflow-y-auto sm:max-w-md ${contentClassName ?? ""}`}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <SigninForm
          mode="modal"
          returnTo={returnTo}
          defaultUserType={defaultUserType}
          allowInlineSignUp={allowInlineSignUp}
          onModalHostSuccess={payload => {
            onSuccess?.(payload);
            onOpenChange(false);
          }}
          onModalTipperSuccess={() => {
            onSuccess?.({ role: "TIPPER" });
            onOpenChange(false);
          }}
          className="py-4"
        />
      </DialogContent>
    </Dialog>
  );
}
