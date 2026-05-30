"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
}: SignInDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <SigninForm
          mode="modal"
          returnTo={returnTo}
          defaultUserType={defaultUserType}
          onModalHostSuccess={payload => {
            onSuccess?.(payload);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
