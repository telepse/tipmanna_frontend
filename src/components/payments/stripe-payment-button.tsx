"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

// Third-party imports
import {
  ExpressCheckoutElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { savePaymentOrigin, getStripeReturnUrl } from "@/lib/payment-origin";
import type { PaymentSurface } from "@/lib/analytics-types";
import {
  getAnalyticsSessionId,
  getDeviceCategory,
} from "@/lib/analytics-session";

interface Character {
  name: string;
  price: number;
}

interface StripeCharacter extends Character {
  id?: string;
  iconUrl?: string;
  time?: string;
  characterId?: string;
}

interface StripePaymentButtonProps {
  totalAmount: number;
  eventId?: string;
  userId?: string;
  role?: string;
  characters: StripeCharacter[];
  onSuccess?: () => void;
  onError?: (error: string) => void;
  paymentSurface?: PaymentSurface;
  paymentChannelId?: string | null;
  getPlaybackOffsetSec?: () => number | null;
  getWatchDurationBeforePayMs?: () => number | null;
}

export const StripePaymentButton = ({
  totalAmount,
  eventId,
  userId,
  role,
  characters,
  onSuccess,
  onError,
  paymentSurface = "unknown",
  paymentChannelId,
  getPlaybackOffsetSec,
  getWatchDurationBeforePayMs,
}: StripePaymentButtonProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [, setErrorMessage] = useState<string | undefined>();
  const [, setProcessing] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  // 🧱 Layout fix function
  const applyStripeLayoutFix = () => {
    const el = containerRef.current;
    if (!el) return;
    el.style.display = "flex";
    el.style.flexDirection = "row";
    el.style.justifyContent = "center";
    el.style.alignItems = "center";
    el.style.gap = "12px";
  };

  // 🧩 MutationObserver to reapply layout each time Stripe changes the DOM
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Apply once immediately
    applyStripeLayoutFix();

    const observer = new MutationObserver(() => {
      applyStripeLayoutFix();
    });

    observer.observe(el, { childList: true, subtree: true });

    // Cleanup
    return () => observer.disconnect();
  }, []);

  const onConfirm = async () => {
    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setErrorMessage(undefined);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setErrorMessage(submitError.message);
        return;
      }

      const { error, confirmationToken } = await stripe.createConfirmationToken(
        {
          elements,
        }
      );

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/payments/create-payment-intent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: Number(totalAmount),
            eventId,
            userId,
            role,
            characters,
            confirmationTokenId: confirmationToken?.id,
            paymentSurface,
            paymentContentId: paymentChannelId ?? undefined,
            playbackOffsetSec: (() => {
              const o = getPlaybackOffsetSec?.();
              return typeof o === "number" && !Number.isNaN(o)
                ? Math.max(0, Math.floor(o))
                : undefined;
            })(),
            watchDurationBeforePayMs: (() => {
              const w = getWatchDurationBeforePayMs?.();
              return typeof w === "number" && !Number.isNaN(w) && w >= 0
                ? Math.floor(w)
                : undefined;
            })(),
            deviceCategory: getDeviceCategory(),
            clientSessionId: getAnalyticsSessionId(),
          }),
        }
      );

      const { client_secret: clientSecret } = await res.json();

      savePaymentOrigin();

      const { error: confirmError } = await stripe.confirmPayment({
        clientSecret,
        confirmParams: {
          confirmation_token: confirmationToken?.id,
          return_url: getStripeReturnUrl(),
        },
      });

      if (clientSecret) {
        router.push("/success");
      }

      if (confirmError) {
        console.error(
          "[StripePaymentButton] confirmPayment failed",
          confirmError
        );
        setErrorMessage(confirmError.message);
      } else {
        onSuccess?.();
      }
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Payment failed";
      setErrorMessage(errorMsg);
      onError?.(errorMsg);
    } finally {
      setProcessing(false);
    }
  };

  if (!stripe) {
    return (
      <div className="flex items-center gap-1">
        <Button className="h-6 flex-1 bg-black text-white">
          <ArrowRight className="size-4 rounded-full bg-white p-0.5 text-black" />{" "}
          <span className="font-semibold">link</span>
        </Button>
        <Button className="h-6 flex-1 bg-black text-white">G Pay</Button>
        <Button className="h-6 flex-1 bg-black text-white">
          <Image
            src="/logos/apple_dark.svg"
            alt="Apple Pay button"
            width={100}
            height={100}
            className="size-5 object-contain"
          />{" "}
          Pay
        </Button>
      </div>
    );
  }

  // Show placeholder buttons when no amount is selected
  if (totalAmount <= 0) {
    return (
      <div className="flex items-center gap-1">
        <Button className="h-6 flex-1 bg-black text-white">
          <ArrowRight className="size-4 rounded-full bg-white p-0.5 text-black" />{" "}
          <span className="font-semibold">link</span>
        </Button>
        <Button className="h-6 flex-1 bg-black text-white">G Pay</Button>
        <Button className="h-6 flex-1 bg-black text-white">
          <Image
            src="/logos/apple_dark.svg"
            alt="Apple Pay button"
            width={100}
            height={100}
            className="size-5 object-contain"
          />{" "}
          Pay
        </Button>
      </div>
    );
  }

  const shouldShowStripeElement = totalAmount > 0 && stripe && elements;

  // Show Stripe element when amount is selected
  return (
    <div className="w-full">
      {/* <div
        id="express-checkout-element"
        ref={containerRef}
        className="grid grid-cols-3 w-full"
      >
        <ExpressCheckoutElement
          options={{
            // paymentMethods: { applePay: "always", googlePay: "always" },
            paymentMethods: {
              applePay: "always",
              googlePay: "always",
            },
            // wallets: {
            //   applePay: "always",
            //   googlePay: "always",
            // },
            layout: {
              maxColumns: 3,
              maxRows: 1,
              overflow: "auto",
            },
          }}
          onConfirm={onConfirm}
        />
      </div> */}
      {shouldShowStripeElement ? (
        <div
          id="express-checkout-element"
          className="grid w-full grid-cols-3"
          ref={containerRef}
        >
          <ExpressCheckoutElement
            options={{
              paymentMethods: { applePay: "always", googlePay: "always" },
              layout: {
                maxColumns: 2,
                maxRows: 2,
                overflow: "auto",
              },
            }}
            onConfirm={onConfirm}
          />
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <Button className="h-6 flex-1 bg-black text-white">
            <ArrowRight className="size-4 rounded-full bg-white p-0.5 text-black" />{" "}
            <span className="font-semibold">link</span>
          </Button>
          <Button className="h-6 flex-1 bg-black text-white">G Pay</Button>
          <Button className="h-6 flex-1 bg-black text-white">
            <Image
              src="/logos/apple_dark.svg"
              alt="Apple Pay button"
              width={100}
              height={100}
              className="size-5 object-contain"
            />{" "}
            Pay
          </Button>
        </div>
      )}
    </div>
  );
};
