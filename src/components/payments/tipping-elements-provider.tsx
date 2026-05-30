"use client";

import { Elements } from "@stripe/react-stripe-js";
import type { StripeElementsOptions } from "@stripe/stripe-js";
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
    if (characterName === "Text") return acc + 5;
    const character = characterMap.get(characterName);
    return acc + (character?.price || 0);
  }, 0);
}

type Props = {
  tippingCharacters: RoomCharacter[];
  children: ReactNode;
};

/**
 * Single Elements tree with deferred amount updates (reduces Elements thrash while selecting tips).
 */
export function TippingElementsProvider({
  tippingCharacters,
  children,
}: Props) {
  const { selectedTips } = useSelector((state: RootState) => state.tip);

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

  const stripe = getStripeBrowserPromise();

  return (
    <Elements
      stripe={stripe}
      options={options}
    >
      {children}
    </Elements>
  );
}
