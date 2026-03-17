"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Third-party imports
import { useDispatch, useSelector } from "react-redux";
import { useMediaQuery } from "react-responsive";
import { Button } from "@/components/ui/button";
import { Loader2, MoveLeft } from "lucide-react";
import { toast } from "react-toastify";
import OtpInput from "react-otp-input";

// Local imports
import { Paragraph } from "@/components/shared/paragraph";
import { resendCodeAction, verifyCodeAction } from "@/actions/auth";
import { RootState } from "@/redux/store";
import { setCredentials } from "@/features/auth-slice";
import { ApiError } from "@/types/api-error.types";

export default function VerifyEmailPage() {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { user, token, tag } = useSelector((state: RootState) => state.auth);

  const router = useRouter();
  const dispatch = useDispatch();

  const isMobile = useMediaQuery({
    query: "(max-width: 500px)",
  });

  const inputStyle = {
    background: "#f7c87c80",
    width: isMobile ? "36px" : "54px",
    height: isMobile ? "36px" : "60px",
    margin: isMobile ? "0 4px" : "0 8px",
    borderRadius: isMobile ? "4px" : "8px",
    outline: "none",
    fontSize: isMobile ? "16px" : "20px",
  };

  const handleVerify = async () => {
    try {
      setIsLoading(true);

      if (!user?.email) return;

      const res = await verifyCodeAction(user.email, code);
      if (!res.success) {
        toast.error(res.message);
        return;
      }

      dispatch(
        setCredentials({
          user,
          token: token!,
          requiresVerification: false,
        })
      );

      toast.success(res.data.message);

      if (user?.role === "HOST" && tag === "EXISTING_HOST") {
        router.push(`/tipper/${user.username}`);
      } else if (user?.role === "TIPPER") {
        router.push(`/tipper/${user.username}`);
      } else if (user?.role === "HOST") {
        router.push(`/host/${user.eventSlug}`);
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
    if (!user?.email) return;

    try {
      setIsLoading(true);

      const res = await resendCodeAction(user.email);

      toast.success(res.data.message);

      setCode("");
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else if (typeof err === "object" && err !== null && "error" in err) {
        const apiErr = err as ApiError;
        toast.error(apiErr.error.message);
      } else {
        toast.error("Failed to resend verification code");
      }

      setCode("");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center">
      <Link
        href="/create-account"
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
          We&apos;ve sent a 6-digit code to <strong>{user?.email}</strong>.{" "}
          <br />
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
          disabled={isLoading || code.length < 6}
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
          Did&apos;t receive the code?{" "}
          <Button
            className="text-primary bg-transparent p-0"
            onClick={handleResendCode}
          >
            Resend code
          </Button>
        </Paragraph>
      </div>
    </div>
  );
}
