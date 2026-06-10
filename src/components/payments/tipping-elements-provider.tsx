"use client";

import { Elements } from "@stripe/react-stripe-js";
import type { Stripe, StripeElementsOptions } from "@stripe/stripe-js";
import { useDeferredValue, useMemo, type ReactNode } from "react";
import { useSelector } from "react-redux";

import { RootState } from "@/redux/store";
import type { RoomCharacter } from "@/types";
import { getStripeBrowserPromise } from "@/lib/stripe-browser";

function totalFromSelection(
  selectedTips: string[],
  characterMap: Map<string, RoomCharacter>
): number {
  return selectedTips.reduce((acc, characterName) => {
    if (characterName === "Comment") return acc + 5;
    const character = characterMap.get(characterName);
    return acc + (character?.price || 0);
  }, 0);
}

type Props = {
  tippingCharacters: RoomCharacter[];
  children: ReactNode;
  /** When false, Stripe.js is not loaded and children render without Elements. */
  enabled?: boolean;
};

/**
 * Single Elements tree with deferred amount updates (reduces Elements thrash while selecting tips).
 * Stripe loads only when `enabled` is true (e.g. tip drawer open).
 */
export function TippingElementsProvider({
  tippingCharacters,
  children,
  enabled = true,
}: Props) {
  const { selectedTips } = useSelector((state: RootState) => state.tip);

  const stripePromise = useMemo<Promise<Stripe | null> | null>(() => {
    if (!enabled) return null;
    return getStripeBrowserPromise();
  }, [enabled]);

  const characterMap = useMemo(() => {
    const map = new Map<string, RoomCharacter>();
    for (const c of tippingCharacters) {
      map.set(c.name, c);
    }
    return map;
  }, [tippingCharacters]);

  const liveTotal = useMemo(
    () => totalFromSelection(selectedTips, characterMap),
    [selectedTips, characterMap]
  );
  const deferredTotal = useDeferredValue(liveTotal);

  const options = useMemo<StripeElementsOptions>(
    () =>
      ({
        mode: "payment",
        amount: Math.max(100, Math.round(deferredTotal * 100)),
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
    [deferredTotal]
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
