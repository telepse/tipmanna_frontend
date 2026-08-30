"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { verifyWalletTokenRequest } from "@/lib/wallet-client";
import { Paragraph } from "@/components/shared/paragraph";

function WalletVerifyInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [msg, setMsg] = useState("Verifying…");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setErr("Missing verification link.");
      setMsg("");
      return;
    }
    void (async () => {
      try {
        const data = await verifyWalletTokenRequest(token);
        const kind = data.verificationKind;
        setMsg(
          kind === "pin_reset"
            ? "Your wallet PIN was reset. You can sign in and use your new PIN."
            : "Tipper wallet activated."
        );
        setErr(null);
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "Verification failed");
        setMsg("");
      }
    })();
  }, [token]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-6">
      {msg && <Paragraph weight="medium">{msg}</Paragraph>}
      {err && (
        <Paragraph
          weight="medium"
          className="text-red-600"
        >
          {err}
        </Paragraph>
      )}
    </div>
  );
}

export default function WalletVerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center p-6">
          Loading…
        </div>
      }
    >
      <WalletVerifyInner />
    </Suspense>
  );
}
