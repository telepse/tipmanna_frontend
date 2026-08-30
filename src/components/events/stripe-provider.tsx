"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Elements } from "@stripe/react-stripe-js";
import type { Stripe, StripeElementsOptions } from "@stripe/stripe-js";
import { useSelector } from "react-redux";

import { RootState } from "@/redux/store";
import { RoomCharacter } from "@/types";
import { getStripeBrowserPromise } from "@/lib/stripe-browser";
import {
  computeTipCartTotal,
  stripeElementsAmountMinor,
} from "@/lib/tip-cart-total";

interface Props {
  children: React.ReactNode;
  tippingCharacters: RoomCharacter[];
  /** When false, Stripe.js is not loaded and children are not rendered (placeholder only). */
  enabled?: boolean;
  /** Host-configured text tip unit price (GBP). Defaults to 5. */
  textTipUnitPrice?: number;
}

export const StripeProvider = ({
  children,
  tippingCharacters,
  enabled = true,
  textTipUnitPrice = 5,
}: Props) => {
  const [stripePromise, setStripePromise] =
    useState<Promise<Stripe | null> | null>(null);
  const { selectedTips } = useSelector((state: RootState) => state.tip);

  useEffect(() => {
    if (!enabled) {
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
  }, [enabled]);

  const liveTotal = useMemo(
    () =>
      computeTipCartTotal(selectedTips, tippingCharacters, textTipUnitPrice),
    [selectedTips, tippingCharacters, textTipUnitPrice]
  );

  const deferredTotal = useDeferredValue(liveTotal);

  const options = useMemo<StripeElementsOptions>(
    () =>
      ({
        mode: "payment",
        amount: stripeElementsAmountMinor(deferredTotal),
        currency: "gbp",
        appearance: { variables: {} },
        fields: {
          billingDetails: {
            name: "never",
            email: "never",
            phone: "never",
            address: "never",
          },
        },
        syncAddressCheckbox: "none",
      }) as unknown as StripeElementsOptions,
    [deferredTotal]
  );

  if (!enabled) {
    return (
      <div
        className="mini-wrapper flex h-[210px] w-full flex-shrink-0 items-center justify-center rounded-t-xl border-t bg-white px-4 py-1 text-sm text-neutral-500 shadow-sm"
        aria-hidden
      />
    );
  }

  if (!stripePromise) {
    return (
      <div className="mini-wrapper flex h-[210px] w-full flex-shrink-0 items-center justify-center rounded-t-xl border-t bg-white px-4 py-1 text-sm text-neutral-500 shadow-sm">
        Loading payment options…
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={options}
    >
      {children}
    </Elements>
  );
};
