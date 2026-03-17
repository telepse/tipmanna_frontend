"use client";

import Image from "next/image";
import { CSSProperties, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Third-party imports
import { BeatLoader } from "react-spinners";
import { useDispatch } from "react-redux";

// Local imports
import { Paragraph } from "@/components/shared/paragraph";
import { markPaymentCompleted } from "@/features/tip-slice";
import { Gem } from "lucide-react";

const override: CSSProperties = {
  display: "block",
  margin: "0 auto",
  borderColor: "red",
};

export default function PaymentSuccessPage() {
  const [loading, setLoading] = useState(true);
  const [color] = useState("#f57d11");

  const [amount, setAmount] = useState<number | null>(null);
  const [, setEventId] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const paymentIntentId = searchParams.get("payment_intent");
  const paymentIntentSecret = searchParams.get("payment_intent_client_secret");

  const router = useRouter();
  const dispatch = useDispatch();

  useEffect(() => {
    // Load eventId and amount from localStorage on mount
    const storedEventId = localStorage.getItem("eventId");
    setEventId(storedEventId);
    const storedAmount = localStorage.getItem("amount");
    if (storedAmount) {
      setAmount(Number(storedAmount));
    }

    // const redirectTarget = searchParams.get("redirect");

    const loadSession = async () => {
      if (!paymentIntentId && !paymentIntentSecret) return;

      dispatch(markPaymentCompleted(true));

      setLoading(false);

      // 👇 Delay 2 seconds, then redirect using eventId from localStorage
      setTimeout(() => {
        if (storedEventId) {
          router.push(`/room/${storedEventId}`);

          localStorage.removeItem("eventId");
          localStorage.removeItem("amount");
        }
      }, 3000);

      // Delay 2-3 seconds, then redirect based on redirectTarget
      // setTimeout(() => {
      //   if (redirectTarget === "tv") {
      //     router.push("/tv"); // Redirect to TV page
      //   } else if (redirectTarget === "room" && storedEventId) {
      //     router.push(`/room/${storedEventId}`); // Redirect to event room
      //   }

      //   // Clean up localStorage
      //   localStorage.removeItem("eventId");
      //   localStorage.removeItem("amount");
      // }, 3000);
    };
    loadSession();
  }, [paymentIntentId, paymentIntentSecret, router, dispatch, searchParams]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <BeatLoader
          color="#f57d11"
          size={20}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center gap-6 p-6">
        <h2 className="flex items-center gap-1 text-center text-3xl font-semibold">
          Tippii <Gem className="text-primary" />
          <Gem className="text-primary" />
        </h2>

        <Image
          src="/success.webp"
          alt="Success"
          width={100}
          height={100}
          className="size-40 object-cover"
        />

        <div className="flex w-full flex-col items-center rounded-xl bg-[#EEB78440] p-6">
          <h2 className="text-3xl">&pound;{amount}</h2>
          <Paragraph
            weight="medium"
            color="muted"
          >
            Successfully sent!
          </Paragraph>
        </div>

        <div className="flex flex-col items-center gap-4">
          <Paragraph
            align="center"
            size="sm"
            weight="medium"
          >
            Get ready to see your tip
          </Paragraph>

          <BeatLoader
            color={color}
            cssOverride={override}
            size={20}
            aria-label="Loading Spinner"
            data-testid="loader"
          />
        </div>
      </div>
    </div>
  );
}
