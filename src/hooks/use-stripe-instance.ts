import { useEffect, useState } from "react";
import type { Stripe } from "@stripe/stripe-js";
import { getStripeBrowserPromise } from "@/lib/stripe-browser";

export const useStripeInstance = () => {
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void getStripeBrowserPromise().then(instance => {
      if (cancelled) return;
      setStripe(instance);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return { stripe, loading };
};
