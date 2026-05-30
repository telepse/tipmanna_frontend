/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

// Third-party imports
import { useDispatch } from "react-redux";
import { persistAuthSession } from "@/lib/session-client";

// Local imports
import { setCredentials } from "@/features/auth-slice";
import { useAppRouter } from "@/components/navigation/navigation-progress-provider";

export default function InvitePage() {
  const { replace } = useAppRouter();
  const token = useSearchParams().get("token");

  const [status, setStatus] = useState<
    "loading" | "invalid" | "valid" | "accepting" | "verifying"
  >("loading");

  const [inviteData, setInviteData] = useState<any>(null);

  // 🔢 2FA Specific States
  const [accessCode, setAccessCode] = useState("");
  const [verificationError, setVerificationError] = useState("");
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);

  // 1. Validate token
  useEffect(() => {
    if (!token) return;

    const validate = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/cohost/invite/validate?token=${token}`
        );

        if (!res.ok) {
          setStatus("invalid");
          return;
        }

        const data = await res.json();
        setInviteData(data);
        setStatus("valid");
      } catch {
        setStatus("invalid");
      }
    };

    validate();
  }, [token]);

  // 2. Accept invite (Triggers the 2FA email)
  const handleAccept = async () => {
    try {
      setStatus("accepting");

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/cohost/invite/accept`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        }
      );

      const data = await res.json();
      console.log(data);

      if (!res.ok) throw new Error("Failed to accept");

      // INSTEAD of redirecting, we change state to show code input
      setStatus("verifying");
    } catch (err) {
      console.error(err);
      setStatus("valid");
    }
  };

  const dispatch = useDispatch();

  // 3. Verify the 6-digit code
  const handleVerifyCode = async () => {
    if (!accessCode || accessCode.length !== 6) {
      setVerificationError("Please enter a valid 6-digit code.");
      return;
    }

    try {
      setVerificationError("");
      setIsSubmittingCode(true);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/cohost/invite/verify-code`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
            code: accessCode,
          }),
        }
      );

      const data = await res.json();
      console.log(data);

      const { id, fullName, email, username } = data.user;
      const { accessToken } = data;

      dispatch(
        setCredentials({
          user: {
            id,
            fullName,
            email,
            username,
            role: "TIPPER",
          },
          token: accessToken!,
          requiresVerification: false,
          tag: "COHOST",
        })
      );

      await persistAuthSession(
        accessToken!,
        {
          id,
          fullName,
          email,
          username,
          role: "TIPPER",
        },
        { expiresDays: 60 }
      );

      if (!res.ok) {
        throw new Error(data.message || "Invalid code");
      }

      // This tells the room that this specific event has a pending welcome modal!
      localStorage.setItem(
        `just_joined_as_cohost_${inviteData.eventId}`,
        "true"
      );

      // 🎉 Success! NOW we send them to the event room
      replace(`/room/${inviteData.eventId}`);
    } catch (err: any) {
      console.error(err);
      setVerificationError(err.message || "Failed to verify code.");
    } finally {
      setIsSubmittingCode(false);
    }
  };

  // ---------------- UI ----------------

  if (status === "loading") {
    return <div className="p-6 text-center">Validating invite...</div>;
  }

  if (status === "invalid") {
    return <div className="p-6 text-center">Invalid or expired invite</div>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6 rounded-xl border p-6">
        <h2 className="text-center text-2xl font-semibold">
          You’ve been invited 🎉
        </h2>

        <p className="text-muted-foreground text-center">
          Join <strong>{inviteData?.eventName}</strong> as a co-host
        </p>

        <hr className="my-4 border-gray-200" />

        {/* 1️⃣ SCREEN A: The initial accept button */}
        {(status === "valid" || status === "accepting") && (
          <button
            type="button"
            onClick={handleAccept}
            disabled={status === "accepting"}
            className="w-full cursor-pointer rounded-lg bg-black py-3 font-medium text-white transition-colors hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "accepting" ? "Sending code..." : "Accept Invite"}
          </button>
        )}

        {/* 2️⃣ SCREEN B: The 2FA code input field */}
        {status === "verifying" && (
          <div className="space-y-4">
            <div className="space-y-1 text-center">
              <p className="text-sm font-medium">Check your email 📧</p>
              <p className="text-muted-foreground text-xs">
                {"We've sent a 6-digit access code to your inbox."}
              </p>
            </div>

            <input
              type="text"
              maxLength={6}
              value={accessCode}
              onChange={e => setAccessCode(e.target.value.replace(/\D/g, ""))} // Only allow digits
              className="w-full rounded-lg border border-gray-300 p-3 text-center font-mono text-2xl tracking-widest transition-all outline-none focus:border-black"
              placeholder="000000"
            />

            {verificationError && (
              <p className="text-center text-xs text-red-500">
                {verificationError}
              </p>
            )}

            <button
              onClick={handleVerifyCode}
              disabled={isSubmittingCode || accessCode.length !== 6}
              className="w-full cursor-pointer rounded-lg bg-black py-3 font-medium text-white transition-colors hover:bg-black/90 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isSubmittingCode ? "Verifying..." : "Verify & Join Room"}
            </button>

            <button
              onClick={() => setStatus("valid")}
              className="text-muted-foreground w-full text-center text-xs hover:underline"
            >
              {"Didn't get a code? Go back and try again"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
