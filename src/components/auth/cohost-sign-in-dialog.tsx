"use client";

import { useCallback, useState } from "react";
import { useDispatch } from "react-redux";
import OTPInput from "react-otp-input";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setCredentials } from "@/features/auth-slice";
import type { AppDispatch } from "@/redux/store";
import { persistAuthSession } from "@/lib/session-client";
import { normalizeEmail } from "@/lib/normalize-email";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  defaultEmail?: string;
  onSuccess?: () => void;
};

export function CohostSignInDialog({
  open,
  onOpenChange,
  eventId,
  defaultEmail = "",
  onSuccess,
}: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const [email, setEmail] = useState(defaultEmail);
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [submitting, setSubmitting] = useState(false);

  const reset = useCallback(() => {
    setStep("email");
    setCode("");
    setSubmitting(false);
  }, []);

  const requestCode = async () => {
    const normalized = normalizeEmail(email);
    if (!normalized) {
      toast.error("Enter your cohost email");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/auth/login-cohost`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalized, eventId }),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: { message?: string } })?.error?.message ??
            "Could not send verification code"
        );
      }
      toast.success("Verification code sent to your email");
      setStep("code");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send code");
    } finally {
      setSubmitting(false);
    }
  };

  const verifyCode = async () => {
    const normalized = normalizeEmail(email);
    if (!normalized || code.length !== 6) {
      toast.error("Enter the 6-digit code from your email");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/auth/verify-cohost-login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalized, code, eventId }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (data as { error?: { message?: string } })?.error?.message ??
            "Invalid verification code"
        );
      }

      const user = (data as { user?: Record<string, unknown> }).user as {
        id: string;
        fullName: string;
        email: string;
        username: string;
      };
      const token = (data as { token?: string }).token ?? "";

      dispatch(
        setCredentials({
          user: {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            username: user.username,
            role: "TIPPER",
          },
          token,
          tag: "COHOST",
        })
      );

      await persistAuthSession(
        token,
        {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          username: user.username,
          role: "TIPPER",
        },
        { expiresDays: 7 }
      );

      toast.success("Signed in as cohost");
      onOpenChange(false);
      reset();
      onSuccess?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sign in as cohost</DialogTitle>
          <DialogDescription>
            Your cohost session expired. Re-verify your email to continue
            managing this event room.
          </DialogDescription>
        </DialogHeader>

        {step === "email" ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="cohost-email">Cohost email</Label>
              <Input
                id="cohost-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <Button
              type="button"
              className="w-full"
              disabled={submitting}
              onClick={() => void requestCode()}
            >
              {submitting ? "Sending…" : "Send verification code"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Enter the 6-digit code sent to <strong>{email}</strong>
            </p>
            <OTPInput
              value={code}
              onChange={setCode}
              numInputs={6}
              renderInput={props => (
                <input
                  {...props}
                  className="border-input mx-1 h-10 w-10 rounded border text-center"
                />
              )}
              shouldAutoFocus
            />
            <Button
              type="button"
              className="w-full"
              disabled={submitting || code.length !== 6}
              onClick={() => void verifyCode()}
            >
              {submitting ? "Verifying…" : "Verify and continue"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              disabled={submitting}
              onClick={() => setStep("email")}
            >
              Use a different email
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
