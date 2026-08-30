import type { Stripe } from "@stripe/stripe-js";

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripeBrowserPromise(): Promise<Stripe | null> {
  if (!stripePromise) {
    stripePromise = import("@stripe/stripe-js").then(({ loadStripe }) =>
      loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!, {
        developerTools: { assistant: { enabled: false } },
      })
    );
  }
  return stripePromise;
}
