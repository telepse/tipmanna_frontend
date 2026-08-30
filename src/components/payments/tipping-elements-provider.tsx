"use client";

import { Elements } from "@stripe/react-stripe-js";
import type { Stripe, StripeElementsOptions } from "@stripe/stripe-js";
import { useDeferredValue, useMemo, type ReactNode } from "react";
import { useSelector } from "react-redux";

import { RootState } from "@/redux/store";
import type { RoomCharacter } from "@/types";
import { getStripeBrowserPromise } from "@/lib/stripe-browser";
import {
  computeTipCartTotal,
  stripeElementsAmountMinor,
} from "@/lib/tip-cart-total";

type Props = {
  tippingCharacters: RoomCharacter[];
  children: ReactNode;
  /** When false, Stripe.js is not loaded and children render without Elements. */
  enabled?: boolean;
  /** Host-configured text tip unit price (GBP). Defaults to 5. */
  textTipUnitPrice?: number;
};

/**
 * Single Elements tree with deferred amount updates (reduces Elements thrash while selecting tips).
 * Stripe loads only when `enabled` is true (e.g. tip drawer open).
 */
export function TippingElementsProvider({
  tippingCharacters,
  children,
  enabled = true,
  textTipUnitPrice = 5,
}: Props) {
  const { selectedTips } = useSelector((state: RootState) => state.tip);

  const stripePromise = useMemo<Promise<Stripe | null> | null>(() => {
    if (!enabled) return null;
    return getStripeBrowserPromise();
  }, [enabled]);

  const liveTotal = useMemo(
    () =>
      computeTipCartTotal(selectedTips, tippingCharacters, textTipUnitPrice),
    [selectedTips, tippingCharacters, textTipUnitPrice]
  );
  const deferredTotal = useDeferredValue(liveTotal);
  const elementsAmount = liveTotal > 0 ? liveTotal : deferredTotal;

  const options = useMemo<StripeElementsOptions>(
    () =>
      ({
        mode: "payment",
        amount: stripeElementsAmountMinor(elementsAmount),
        currency: "gbp",
        appearance: {
          variables: {
            colorPrimary: "#f57d11",
          },
        },
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
    [elementsAmount]
  );

  if (!enabled) {
    return <>{children}</>;
  }

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
