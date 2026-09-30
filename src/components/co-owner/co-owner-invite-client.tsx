"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_URL;

function apiErrorMessage(raw: unknown, fallback: string): string {
  if (typeof raw !== "object" || raw === null) return fallback;
  const obj = raw as { message?: unknown; error?: { message?: unknown } };
  if (typeof obj.error?.message === "string" && obj.error.message.trim()) {
    return obj.error.message;
  }
  if (typeof obj.message === "string" && obj.message.trim()) {
    return obj.message;
  }
  return fallback;
}

type InviteState = {
  hostName: string;
  coOwnerName: string;
  payoutPercentBp: number;
  status: string;
  expiresAt: string;
  needsRepair?: boolean;
} | null;

export function CoOwnerInviteClient({ token }: { token: string }) {
  const [invite, setInvite] = useState<InviteState>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const repairAttemptedRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${apiBase}/public/co-owner-invite/${encodeURIComponent(token)}`
      );
      const raw = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(apiErrorMessage(raw, "Invite not found"));
        setInvite(null);
        return;
      }
      setInvite({
        hostName: String((raw as { hostName?: string }).hostName ?? ""),
        coOwnerName: String(
          (raw as { coOwnerName?: string }).coOwnerName ?? ""
        ),
        payoutPercentBp: Number(
          (raw as { payoutPercentBp?: number }).payoutPercentBp ?? 0
        ),
        status: String((raw as { status?: string }).status ?? ""),
        expiresAt: String((raw as { expiresAt?: string }).expiresAt ?? ""),
        needsRepair: Boolean((raw as { needsRepair?: boolean }).needsRepair),
      });
    } catch {
      setError("Could not load invite");
      setInvite(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!invite?.needsRepair || repairAttemptedRef.current) return;
    repairAttemptedRef.current = true;
    setBusy("repair");
    void fetch(
      `${apiBase}/public/co-owner-invite/${encodeURIComponent(token)}/approve`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }
    )
      .then(async res => {
        if (!res.ok) {
          const raw = await res.json().catch(() => ({}));
          setError(apiErrorMessage(raw, "Could not finish approval sync"));
          return;
        }
        await load();
        setInfo("Your approval is complete. Videos should appear shortly.");
      })
      .catch(() => setError("Network error"))
      .finally(() => setBusy(null));
  }, [invite?.needsRepair, load, token]);

  const requestOtp = async () => {
    setBusy("otp");
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(
        `${apiBase}/public/co-owner-invite/${encodeURIComponent(token)}/otp`,
        { method: "POST" }
      );
      const raw = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(apiErrorMessage(raw, "Could not send code"));
        return;
      }
      setError(null);
      setInfo(
        "If your email matches this invite, a one-time code was sent. Check your inbox."
      );
    } catch {
      setError("Network error");
    } finally {
      setBusy(null);
    }
  };

  const approve = async () => {
    setBusy("approve");
    setError(null);
    try {
      const res = await fetch(
        `${apiBase}/public/co-owner-invite/${encodeURIComponent(token)}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: code.trim() }),
        }
      );
      const raw = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(apiErrorMessage(raw, "Approval failed"));
        return;
      }
      await load();
      setCode("");
    } catch {
      setError("Network error");
    } finally {
      setBusy(null);
    }
  };

  const decline = async () => {
    if (!confirm("Decline this co-owner invite?")) return;
    setBusy("decline");
    setError(null);
    try {
      const res = await fetch(
        `${apiBase}/public/co-owner-invite/${encodeURIComponent(token)}/decline`,
        { method: "POST" }
      );
      if (!res.ok) {
        setError("Could not decline");
        return;
      }
      await load();
    } catch {
      setError("Network error");
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="text-muted-foreground flex min-h-[40vh] items-center justify-center gap-2">
        <Loader2 className="size-5 animate-spin" />
        Loading invite…
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className="mx-auto max-w-md p-6">
        <p className="text-destructive text-sm">{error}</p>
      </div>
    );
  }

  if (!invite) return null;

  const pending = invite.status === "pending";
  const repairing = invite.needsRepair && busy === "repair";

  return (
    <div className="mx-auto max-w-md space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Co-owner invitation</h1>
        <p className="text-muted-foreground text-sm">
          {invite.hostName} invited you as a co-owner (
          {(invite.payoutPercentBp / 100).toFixed(2)}% share).
        </p>
      </header>

      <div className="rounded-lg border bg-white p-4 text-sm shadow-sm">
        <p>
          <span className="text-muted-foreground">Name on invite: </span>
          {invite.coOwnerName}
        </p>
        <p className="text-muted-foreground mt-2 text-xs">
          Status: {invite.status} · Expires{" "}
          {new Date(invite.expiresAt).toLocaleString()}
        </p>
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {info ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {info}
        </p>
      ) : null}

      {repairing ? (
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Finishing approval sync…
        </div>
      ) : null}

      {pending ? (
        <div className="space-y-4">
          <p className="text-sm">
            Request a one-time code to your invite email, enter it below, then
            approve. A fresh code is required for each approval step.
          </p>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={!!busy}
            onClick={() => void requestOtp()}
          >
            {busy === "otp" ? "Sending…" : "Email me a code"}
          </Button>
          <div className="space-y-2">
            <Label htmlFor="otp">One-time code</Label>
            <Input
              id="otp"
              autoComplete="one-time-code"
              value={code}
              onChange={e => setCode(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              className="flex-1"
              disabled={!!busy}
              onClick={() => void approve()}
            >
              {busy === "approve" ? "Working…" : "Approve"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              disabled={!!busy}
              onClick={() => void decline()}
            >
              {busy === "decline" ? "Working…" : "Decline"}
            </Button>
          </div>
        </div>
      ) : invite.needsRepair ? null : (
        <p className="text-muted-foreground text-sm">
          This invite is no longer pending. No further action is required on
          this page.
        </p>
      )}
    </div>
  );
}
