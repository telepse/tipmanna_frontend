import { loadStripe } from "@stripe/stripe-js";
import { useEffect, useState } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let stripePromise: Promise<any> | null = null;

export const useStripeInstance = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [stripe, setStripe] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeStripe = async () => {
      if (!stripePromise) {
        stripePromise = loadStripe(
          process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
        );
      }

      const stripeInstance = await stripePromise;
      setStripe(stripeInstance);
      setLoading(false);
    };

    initializeStripe();
  }, []);

  return { stripe, loading };
};
