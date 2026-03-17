"use client";

import { Elements } from "@stripe/react-stripe-js";
import { loadStripe, StripeElementsOptions } from "@stripe/stripe-js";
import { useSelector } from "react-redux";

// Local imports
import { RootState } from "@/redux/store";
import { RoomCharacter } from "@/types";
import { useMediaQuery } from "react-responsive";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
  {
    developerTools: { assistant: { enabled: false } },
  }
);

interface Props {
  children: React.ReactNode;
  tippingCharacters: RoomCharacter[];
}

export const StripeProvider = ({ children, tippingCharacters }: Props) => {
  const { selectedTips } = useSelector((state: RootState) => state.tip);

  const totalAmount = selectedTips.reduce((acc, characterName) => {
    if (characterName === "Text") {
      return acc + 5;
    }
    const character = tippingCharacters.find(
      (c: RoomCharacter) => c.name === characterName
    );
    return acc + (character?.price || 0);
  }, 0);

  const isMobile = useMediaQuery({ maxWidth: 768 });

  const options: StripeElementsOptions = {
    mode: "payment",
    amount: totalAmount * 100 || 100,
    currency: "gbp",
    appearance: {
      variables: {
        // spacingGridRow: "4px",
        // spacingGridColumn: "4px",
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
  } as unknown as StripeElementsOptions;

  return (
    <Elements
      stripe={stripePromise}
      options={options}
    >
      {children}
    </Elements>
  );
};
