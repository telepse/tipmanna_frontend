"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Elements } from "@stripe/react-stripe-js";
import type { Stripe, StripeElementsOptions } from "@stripe/stripe-js";
import { useSelector } from "react-redux";

import { RootState } from "@/redux/store";
import { RoomCharacter } from "@/types";
import { getStripeBrowserPromise } from "@/lib/stripe-browser";

interface Props {
  children: React.ReactNode;
  tippingCharacters: RoomCharacter[];
  /** When false, Stripe.js is not loaded and children are not rendered (placeholder only). */
  enabled?: boolean;
}

export const StripeProvider = ({
  children,
  tippingCharacters,
  enabled = true,
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

  const characterMap = useMemo(() => {
    const map = new Map<string, RoomCharacter>();
    for (const c of tippingCharacters) {
      map.set(c.name, c);
    }
    return map;
  }, [tippingCharacters]);

  const totalAmount = useMemo(() => {
    return selectedTips.reduce((acc, characterName) => {
      if (characterName === "Text") return acc + 5;
      const character = characterMap.get(characterName);
      return acc + (character?.price || 0);
    }, 0);
  }, [selectedTips, characterMap]);

  const deferredAmount = useDeferredValue(totalAmount);

  const options = useMemo<StripeElementsOptions>(
    () =>
      ({
        mode: "payment",
        amount: deferredAmount * 100 || 100,
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
    [deferredAmount]
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
