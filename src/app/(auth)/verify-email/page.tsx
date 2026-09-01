"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useDispatch } from "react-redux";
import { useMediaQuery } from "react-responsive";
import { Button } from "@/components/ui/button";
import { Loader2, MoveLeft } from "lucide-react";
import { toast } from "react-toastify";
import OtpInput from "react-otp-input";
import { Paragraph } from "@/components/shared/paragraph";
import { resendCodeAction, verifyCodeAction } from "@/actions/auth";
import { ApiError } from "@/types/api-error.types";
import { parseAuthResponse } from "@/lib/auth-response";
import { applyPrimaryAndHostSessions } from "@/lib/apply-auth-sessions";
import { buildCreatorProfileSharePath } from "@/lib/creator-profile-url";
import type { AppDispatch } from "@/redux/store";

function safeInternalPath(next: string | null): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

function parseAccountType(raw: string | null): "TIPPER" | "HOST" {
  return raw?.trim().toUpperCase() === "HOST" ? "HOST" : "TIPPER";
}

export default function VerifyEmailPage() {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch<AppDispatch>();

  const emailParam = searchParams.get("email");
  const accountType = parseAccountType(searchParams.get("accountType"));
  const verifyEmail = emailParam?.trim() ?? "";

  const isMobile = useMediaQuery({ query: "(max-width: 500px)" });

  const inputStyle = {
    background: "#f7c87c80",
    width: isMobile ? "36px" : "54px",
    height: isMobile ? "36px" : "60px",
    margin: isMobile ? "0 4px" : "0 8px",
    borderRadius: isMobile ? "4px" : "8px",
    outline: "none",
    fontSize: isMobile ? "16px" : "20px",
  };

  const postVerifyDestination = useMemo(() => {
    const nextDest = safeInternalPath(
      searchParams.get("next") ?? searchParams.get("redirect")
    );
    if (nextDest) return nextDest;
    return null;
  }, [searchParams]);

  const handleVerify = async () => {
    try {
      setIsLoading(true);

      if (!verifyEmail) {
        toast.error("Missing email — return to sign up or sign in");
        return;
      }

      const res = await verifyCodeAction(verifyEmail, code, accountType);
      if (!res.success) {
        toast.error(res.message);
        return;
      }

      const parsed = parseAuthResponse(res.data);
      if (!parsed?.user || !parsed.token) {
        toast.error("Verification succeeded but session could not be restored");
        return;
      }

      if (accountType === "HOST") {
        const { hostSessionPersisted } = await applyPrimaryAndHostSessions(
          parsed,
          dispatch
        );
        if (parsed.hostSession && !hostSessionPersisted) {
          toast.error("Host session could not be saved. Please sign in again.");
          return;
        }
      } else {
        await applyPrimaryAndHostSessions(parsed, dispatch);
      }

      toast.success(
        (res.data as { message?: string })?.message ??
          "Email verified successfully"
      );

      if (postVerifyDestination) {
        router.push(postVerifyDestination);
        setCode("");
        return;
      }

      if (accountType === "HOST" && parsed.hostSession?.user.eventSlug) {
        router.push(`/host/${parsed.hostSession.user.eventSlug}`);
      } else if (accountType === "HOST" && parsed.hostSession?.user.username) {
        router.push(
          buildCreatorProfileSharePath(parsed.hostSession.user.username)
        );
      } else {
        router.push("/explore");
      }

      setCode("");
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else if (typeof err === "object" && err !== null && "error" in err) {
        const apiErr = err as ApiError;
        toast.error(apiErr.error.message);
      } else {
        toast.error("Failed to verify email");
      }
      setCode("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!verifyEmail || resendCooldown > 0) return;

    try {
      setIsLoading(true);
      const res = await resendCodeAction(verifyEmail, accountType);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success(
        (res.data as { message?: string })?.message ??
          "Verification code resent"
      );
      setResendCooldown(30);
      const interval = window.setInterval(() => {
        setResendCooldown(c => {
          if (c <= 1) {
            window.clearInterval(interval);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
      setCode("");
    } catch (err: unknown) {
      if (err instanceof Error) toast.error(err.message);
      else toast.error("Failed to resend verification code");
      setCode("");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center">
      <Link
        href="/sign-in"
        className="hover:bg-secondary absolute top-4 left-4 flex w-fit items-center gap-2 rounded-full px-4 py-2 text-base sm:top-8 sm:left-8 sm:text-lg"
      >
        <MoveLeft /> Back
      </Link>

      <div className="mx-auto flex max-w-xl flex-col items-center space-y-6 p-4">
        <h1 className="racing_sans_one text-3xl sm:text-5xl">
          Verify your email
        </h1>

        <Paragraph
          align="center"
          size="sm"
          color="muted"
        >
          We&apos;ve sent a 6-digit code to{" "}
          <strong>{verifyEmail || "your email"}</strong>. <br />
          Enter it below to verify your account.
        </Paragraph>

        <div className="react-otp-input">
          <OtpInput
            value={code}
            onChange={setCode}
            numInputs={6}
            renderInput={props => <input {...props} />}
            inputStyle={inputStyle}
            shouldAutoFocus
          />
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isLoading || code.length < 6 || !verifyEmail}
          onClick={handleVerify}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" /> Verifying email...
            </span>
          ) : (
            <span>Verify email</span>
          )}
        </Button>

        <Paragraph
          align="center"
          size="sm"
        >
          Didn&apos;t receive the code?{" "}
          <Button
            className="text-primary bg-transparent p-0"
            disabled={resendCooldown > 0 || !verifyEmail}
            onClick={handleResendCode}
          >
            {resendCooldown > 0
              ? `Resend in ${resendCooldown}s`
              : "Resend code"}
          </Button>
        </Paragraph>
      </div>
    </div>
  );
}
