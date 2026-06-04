"use client";

import { Elements } from "@stripe/react-stripe-js";
import { useEffect, useMemo, useState } from "react";
import type { Stripe } from "@stripe/stripe-js";
import { getStripeBrowserPromise } from "@/lib/stripe-browser";

export default function StripeWrapper({
  clientSecret,
  children,
}: {
  clientSecret: string;
  children: React.ReactNode;
}) {
  const [stripePromise, setStripePromise] =
    useState<Promise<Stripe | null> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getStripeBrowserPromise().then(p => {
      if (!cancelled) setStripePromise(Promise.resolve(p));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const options = useMemo(() => ({ clientSecret }), [clientSecret]);

  if (!stripePromise) {
    return null;
  }

  return (
    <Elements
      stripe={stripePromise}
      options={options}
    >
      {children}
    </Elements>
  );
}
