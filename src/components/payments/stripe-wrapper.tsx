"use client";

import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

export default function StripeWrapper({
  clientSecret,
  children,
}: {
  clientSecret: string;
  children: React.ReactNode;
}) {
  const options = { clientSecret };

  return (
    <Elements
      stripe={stripePromise}
      options={options}
    >
      {children}
    </Elements>
  );
}
