"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";

import { getTayeGateContextAction } from "@/actions/taye";
import { TipperEmailOtpSignInDialog } from "@/components/auth/tipper-email-otp-sign-in-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { usePushPermission } from "@/hooks/use-push-permission";
import { ensurePushForSignedInTipper } from "@/lib/program-push-setup";
import type { RootState } from "@/redux/store";

type Props = {
  eventId: string;
  eventName?: string;
  partial?: boolean;
  partnerSiteOrigin?: string | null;
  onSuccess: () => void;
};

export function EventTayePartialWaitRoom({
  partnerSiteOrigin,
}: {
  partnerSiteOrigin?: string | null;
}) {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
      <Lock className="text-muted-foreground size-10" />
      <h1 className="text-xl font-semibold">Access not complete yet</h1>
      <p className="text-muted-foreground text-sm">
        You unlocked TAYE on Tipmanna. Finish your ticket purchase or
        registration
        {partnerSiteOrigin
          ? ` on ${partnerSiteOrigin}`
          : " on the ticketing site"}{" "}
        to get full access to the event room.
      </p>
    </div>
  );
}

export function EventTayeUnlockForm({ eventId, eventName, onSuccess }: Props) {
  const searchParams = useSearchParams();
  const authToken = useSelector((s: RootState) => s.auth.token);
  const user = useSelector((s: RootState) => s.auth.user);
  const isAuthenticated =
    Boolean(authToken) &&
    user?.role !== "VISITOR" &&
    String(user?.role ?? "").toUpperCase() !== "VISITOR";

  const [code, setCode] = useState("");
  const [setReminder, setSetReminder] = useState(true);
  const [pushOk, setPushOk] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tayeType, setTayeType] = useState<string | null>(null);
  const { subscribe, state: pushState } = usePushPermission();

  useEffect(() => {
    const prefill = searchParams.get("code");
    if (prefill) setCode(prefill);
  }, [searchParams]);

  useEffect(() => {
    void getTayeGateContextAction(eventId).then(res => {
      if (res.success && res.data?.tayeEnabled) {
        setTayeType(res.data.tayeType ?? null);
      }
    });
  }, [eventId]);

  const activatePush = async () => {
    const result = await ensurePushForSignedInTipper({
      pushState,
      subscribe,
      token: authToken,
    });
    const ok = result === "already_subscribed" || result === "push_enabled";
    setPushOk(ok);
    if (!ok) toast.error("Enable push notifications to continue.");
    return ok;
  };

  const requestCode = async () => {
    if (!authToken) {
      setSignInOpen(true);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/taye/events/${encodeURIComponent(eventId)}/request-code`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (!res.ok) throw new Error("Request failed");
      toast.success("Check your email for your TAYE access code.");
    } catch {
      toast.error("Could not send access code.");
    } finally {
      setBusy(false);
    }
  };

  const unlock = async () => {
    if (!authToken) {
      setSignInOpen(true);
      return;
    }
    if (!setReminder) {
      toast.error("Set a reminder to unlock TAYE access.");
      return;
    }
    const pushEnabled = pushOk || (await activatePush());
    if (!pushEnabled) return;

    setBusy(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/taye/events/${encodeURIComponent(eventId)}/unlock`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code: code.trim(),
            offsetMinutes: 15,
            pushEnabled: true,
            directPath: true,
          }),
        }
      );
      const data = (await res.json()) as {
        partial?: boolean;
        error?: { message?: string };
      };
      if (!res.ok) {
        throw new Error(data.error?.message ?? "Unlock failed");
      }
      toast.success(
        data.partial
          ? "Partial access granted — complete checkout on the ticketing site."
          : "Access granted — welcome to the event room."
      );
      onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unlock failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-8">
      <div className="text-center">
        <Lock className="text-muted-foreground mx-auto size-10" />
        <h1 className="mt-2 text-xl font-semibold">Tip as you enjoy</h1>
        <p className="text-muted-foreground text-sm">
          {eventName ?? "This event"} uses the TAYE gate
          {tayeType === "discount" ? " (discount + room access)" : ""}.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="taye-code">Access code</Label>
        <Input
          id="taye-code"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="From your email"
        />
        <Button
          type="button"
          variant="link"
          className="h-auto p-0 text-sm"
          onClick={() => void requestCode()}
          disabled={busy}
        >
          Send me a code
        </Button>
      </div>

      <div className="flex items-start gap-2">
        <Checkbox
          id="taye-reminder"
          checked={setReminder}
          onCheckedChange={v => setSetReminder(Boolean(v))}
        />
        <Label
          htmlFor="taye-reminder"
          className="text-sm leading-snug"
        >
          Set event reminder (email + in-app) and agree to tip during the event
        </Label>
      </div>

      <div className="flex items-start gap-2">
        <Checkbox
          id="taye-push"
          checked={pushOk || pushState === "granted"}
          onCheckedChange={() => void activatePush()}
        />
        <Label
          htmlFor="taye-push"
          className="text-sm leading-snug"
        >
          Enable push — includes a reminder 20 minutes after the event starts
        </Label>
      </div>

      {!isAuthenticated ? (
        <Button
          type="button"
          className="w-full"
          onClick={() => setSignInOpen(true)}
        >
          Sign in / sign up to unlock
        </Button>
      ) : (
        <Button
          type="button"
          className="w-full"
          disabled={busy || !code.trim()}
          onClick={() => void unlock()}
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            "Proceed to unlock"
          )}
        </Button>
      )}

      <TipperEmailOtpSignInDialog
        open={signInOpen}
        onOpenChange={setSignInOpen}
        signInTitle="Sign in for TAYE unlock"
        signupSurface="event_room"
        onVerified={() => setSignInOpen(false)}
      />
    </div>
  );
}
