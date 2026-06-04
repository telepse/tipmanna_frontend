"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getStripeBrowserPromise } from "@/lib/stripe-browser";
import { savePaymentOrigin, getStripeReturnUrl } from "@/lib/payment-origin";
import { useSelector } from "react-redux";
import { subscribeCommunityAction } from "@/actions/communities";
import type { RootState } from "@/redux/store";

export const COMMUNITY_SUBSCRIBE_CTX_KEY = "communitySubscribeCtx_v1";

function StripeSubscribeInner({
  communityId,
  onSuccess,
}: {
  communityId: string;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();

  const [busy, setBusy] = useState(false);

  const pay = async () => {
    if (!stripe || !elements) return;
    setBusy(true);
    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        toast.error(submitError.message ?? "Check payment details");
        return;
      }
      try {
        sessionStorage.setItem(
          COMMUNITY_SUBSCRIBE_CTX_KEY,
          JSON.stringify({ communityId })
        );
      } catch {
        /* ignore */
      }
      savePaymentOrigin();
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: getStripeReturnUrl(),
        },
      });
      if (error) {
        console.error("[CommunitySubscribe] confirmPayment failed", error);
        toast.error(error.message ?? "Payment failed");
      } else {
        onSuccess();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <PaymentElement />
      <Button
        type="button"
        className="w-full"
        disabled={busy}
        onClick={() => void pay()}
      >
        {busy ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" /> Processing…
          </>
        ) : (
          "Pay with card"
        )}
      </Button>
    </div>
  );
}

export function CommunitySubscribeSection({
  communityId,
  feeGbp,
  activeUntil,
  onSubscriptionChange,
}: {
  communityId: string;
  feeGbp: string;
  activeUntil: string | null;
  onSubscriptionChange: () => void;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadingStripe, setLoadingStripe] = useState(false);
  const [pin, setPin] = useState("");
  const [walletLoading, setWalletLoading] = useState(false);

  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const [stripePromise, setStripePromise] = useState<ReturnType<
    typeof getStripeBrowserPromise
  > | null>(null);

  useEffect(() => {
    if (!clientSecret) {
      setStripePromise(null);
      return;
    }
    let cancelled = false;
    void getStripeBrowserPromise().then(p => {
      if (!cancelled) setStripePromise(Promise.resolve(p));
    });
    return () => {
      cancelled = true;
    };
  }, [clientSecret]);

  const startStripe = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoadingStripe(true);
    try {
      const res = await subscribeCommunityAction(undefined, communityId, {
        method: "stripe",
      });
      if (!res.success || !res.data) {
        toast.error(res.message ?? "Could not start payment");
        return;
      }
      const d = res.data as { client_secret?: string };
      if (!d.client_secret) {
        toast.error("Missing payment session");
        return;
      }
      setClientSecret(d.client_secret);
    } finally {
      setLoadingStripe(false);
    }
  }, [communityId, isAuthenticated]);

  const payWallet = async () => {
    if (!isAuthenticated) return;
    if (!pin.trim()) {
      toast.error("Enter your wallet PIN");
      return;
    }
    setWalletLoading(true);
    try {
      const res = await subscribeCommunityAction(undefined, communityId, {
        method: "wallet",
        pin: pin.trim(),
      });
      if (!res.success) {
        toast.error(res.message ?? "Payment failed");
        return;
      }
      toast.success("Subscribed for 1 month");
      setPin("");
      onSubscriptionChange();
    } finally {
      setWalletLoading(false);
    }
  };

  if (activeUntil) {
    return (
      <div className="bg-muted/40 rounded-lg border p-4 text-sm">
        <p className="font-medium">Paid membership active</p>
        <p className="text-muted-foreground mt-1">
          Renews / ends: {new Date(activeUntil).toLocaleString()}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-muted/40 space-y-4 rounded-lg border p-4">
      <p className="text-sm font-medium">
        Subscribe — £{feeGbp} / month (1 month, auto-expires)
      </p>

      <div className="space-y-2">
        <Label htmlFor="sub-pin">Tipper Wallet PIN</Label>
        <div className="flex flex-wrap items-end gap-2">
          <Input
            id="sub-pin"
            type="password"
            className="max-w-[200px]"
            value={pin}
            onChange={e => setPin(e.target.value)}
            autoComplete="off"
          />
          <Button
            type="button"
            variant="secondary"
            disabled={walletLoading}
            onClick={() => void payWallet()}
          >
            {walletLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Pay with wallet"
            )}
          </Button>
        </div>
      </div>

      {!clientSecret ? (
        <Button
          type="button"
          variant="outline"
          disabled={loadingStripe}
          onClick={() => void startStripe()}
          className="w-full"
        >
          {loadingStripe ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            "Pay with card (Stripe)"
          )}
        </Button>
      ) : stripePromise ? (
        <Elements
          stripe={stripePromise}
          options={{ clientSecret, appearance: { theme: "stripe" } }}
        >
          <StripeSubscribeInner
            communityId={communityId}
            onSuccess={() => onSubscriptionChange()}
          />
        </Elements>
      ) : (
        <div className="text-muted-foreground flex items-center justify-center py-6 text-sm">
          <Loader2 className="mr-2 size-4 animate-spin" />
          Loading payment…
        </div>
      )}
    </div>
  );
}
