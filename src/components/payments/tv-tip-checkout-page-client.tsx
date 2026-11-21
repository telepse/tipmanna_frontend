"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { getStripeBrowserPromise } from "@/lib/stripe-browser";
import {
  createTvTipCheckoutPaymentIntent,
  type TvTipCheckoutPublicSession,
} from "@/lib/tv-tip-checkout-client";
import { Button } from "@/components/ui/button";

function PayForm({ session }: { session: TvTipCheckoutPublicSession }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onPay() {
    if (!stripe || !elements) return;
    setBusy(true);
    setMessage(null);
    const result = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });
    setBusy(false);
    if (result.error) {
      setMessage(result.error.message ?? "Payment failed");
      return;
    }
    if (result.paymentIntent?.status === "succeeded") {
      setMessage("Payment confirmed. You can return to the TV.");
      return;
    }
    setMessage("Payment status: " + (result.paymentIntent?.status ?? "unknown"));
  }

  return (
    <div className="space-y-4">
      <PaymentElement />
      <Button type="button" disabled={busy || !stripe} onClick={() => void onPay()}>
        {busy ? "Processing…" : `Pay £${session.amountGbp.toFixed(2)}`}
      </Button>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}

export function TvTipCheckoutPageClient({
  session,
  token,
}: {
  session: TvTipCheckoutPublicSession;
  token: string;
}) {
  const stripePromise = useMemo(() => getStripeBrowserPromise(), []);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void createTvTipCheckoutPaymentIntent(token)
      .then(res => {
        if (!cancelled) setClientSecret(res.client_secret);
      })
      .catch(e => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not start payment");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="mx-auto max-w-md space-y-6 p-6">
      <header>
        <h1 className="text-xl font-semibold">Complete your TV tip</h1>
        <p className="text-sm text-muted-foreground">{session.eventTitle}</p>
        <p className="mt-2 text-lg font-bold">
          £{session.amountGbp.toFixed(2)} {session.currency}
        </p>
        <p className="text-xs text-muted-foreground">
          Expires {new Date(session.expiresAt).toLocaleString()}
        </p>
      </header>
      <ul className="text-sm">
        {session.lines.map((line, i) => (
          <li key={`${line.characterId}-${i}`}>
            {line.name} — £{line.price.toFixed(2)}
          </li>
        ))}
      </ul>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {clientSecret && stripePromise ? (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <PayForm session={session} />
        </Elements>
      ) : (
        !error && <p className="text-sm text-muted-foreground">Loading secure checkout…</p>
      )}
    </div>
  );
}
