// "use client";

// import Image from "next/image";
// import { CSSProperties, useEffect, useState } from "react";
// import { useRouter, useSearchParams } from "next/navigation";

// // Third-party imports
// import { BeatLoader } from "react-spinners";
// import { useDispatch } from "react-redux";

// // Local imports
// import { Paragraph } from "@/components/shared/paragraph";
// import { markPaymentCompleted } from "@/features/tip-slice";
// import { redirectAfterPaymentSuccess } from "@/lib/payment-success-redirect";
// import { Gem } from "lucide-react";

// const override: CSSProperties = {
//   display: "block",
//   margin: "0 auto",
//   borderColor: "red",
// };

// export default function PaymentSuccessPage() {
//   const [loading, setLoading] = useState(true);
//   const [color] = useState("#f57d11");

//   const [amount, setAmount] = useState<number | null>(null);

//   const searchParams = useSearchParams();
//   const paymentIntentId = searchParams.get("payment_intent");
//   const paymentIntentSecret = searchParams.get("payment_intent_client_secret");

//   const router = useRouter();
//   const dispatch = useDispatch();

//   useEffect(() => {
//     const storedEventId = localStorage.getItem("eventId");
//     const storedAmount = localStorage.getItem("amount");
//     if (storedAmount) {
//       setAmount(Number(storedAmount));
//     }

//     const hasStripeReturn =
//       Boolean(paymentIntentId) || Boolean(paymentIntentSecret);

//     const run = () => {
//       dispatch(markPaymentCompleted(true));
//       setLoading(false);

//       const delayMs = hasStripeReturn ? 1500 : 800;

//       window.setTimeout(() => {
//         redirectAfterPaymentSuccess(router, storedEventId);
//       }, delayMs);
//     };

//     run();
//   }, [paymentIntentId, paymentIntentSecret, router, dispatch]);

//   if (loading) {
//     return (
//       <div className="flex min-h-screen flex-col items-center justify-center">
//         <BeatLoader
//           color="#f57d11"
//           size={20}
//         />
//       </div>
//     );
//   }

//   const showAmount =
//     typeof amount === "number" && !Number.isNaN(amount) && amount > 0;

//   return (
//     <div className="flex min-h-screen flex-col items-center justify-center">
//       <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center gap-6 p-6">
//         <h2 className="flex items-center gap-1 text-center text-3xl font-semibold">
//           Tippii <Gem className="text-primary" />
//           <Gem className="text-primary" />
//         </h2>

//         <Image
//           src="/success.webp"
//           alt="Success"
//           width={100}
//           height={100}
//           className="size-40 object-cover"
//         />

//         <div className="flex w-full flex-col items-center rounded-xl bg-[#EEB78440] p-6">
//           {showAmount ? (
//             <h2 className="text-3xl">£{amount}</h2>
//           ) : (
//             <h2 className="text-2xl">Thank you</h2>
//           )}
//           <Paragraph
//             weight="medium"
//             color="muted"
//           >
//             {paymentIntentId || paymentIntentSecret
//               ? "Successfully sent!"
//               : "Taking you back…"}
//           </Paragraph>
//         </div>

//         <div className="flex flex-col items-center gap-4">
//           <Paragraph
//             align="center"
//             size="sm"
//             weight="medium"
//           >
//             Get ready to see your tip
//           </Paragraph>

//           <BeatLoader
//             color={color}
//             cssOverride={override}
//             size={20}
//             aria-label="Loading Spinner"
//             data-testid="loader"
//           />
//         </div>
//       </div>
//     </div>
//   );
// }

"use client";

import Image from "next/image";
import { CSSProperties, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Third-party imports
import { BeatLoader } from "react-spinners";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "@/redux/store";

// Local imports
import { Paragraph } from "@/components/shared/paragraph";
import { markPaymentCompleted } from "@/features/tip-slice";
import {
  PAYMENT_ORIGIN_STORAGE_KEY,
  readTipResumeCtx,
} from "@/lib/payment-origin";
import { setPaymentPendingReturn } from "@/lib/tv-payment-snapshot";
import {
  runPaymentRecoveryExchange,
  sanitizeSuccessUrlInHistory,
} from "@/lib/payment-recovery-exchange";
import { getAnalyticsSessionId } from "@/lib/analytics-session";
import { sanitizeEventIdForRoomRedirect } from "@/lib/public-video-url";
import {
  fetchWalletStatus,
  reconcileWalletTopupRequest,
} from "@/lib/wallet-client";
import { reconcileCommunitySubscribeAction } from "@/actions/communities";
import { COMMUNITY_SUBSCRIBE_CTX_KEY } from "@/components/community/community-subscribe-section";

import { Gem } from "lucide-react";
import { markPendingPaymentPrompt } from "@/lib/pwa-install-trigger";

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
  const [pendingTipAfterTopup, setPendingTipAfterTopup] = useState(false);
  const [topupStillProcessing, setTopupStillProcessing] = useState(false);

  const searchParams = useSearchParams();
  const paymentIntentId = searchParams.get("payment_intent");
  const paymentIntentSecret = searchParams.get("payment_intent_client_secret");

  const router = useRouter();
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const authUser = useSelector((s: RootState) => s.auth.user);

  useEffect(() => {
    // Load eventId and amount from localStorage on mount
    const storedEventId = sanitizeEventIdForRoomRedirect(
      localStorage.getItem("eventId")
    );
    setEventId(storedEventId);
    const storedAmount = localStorage.getItem("amount");
    if (storedAmount) {
      setAmount(Number(storedAmount));
    }

    // const redirectTarget = searchParams.get("redirect");

    const loadSession = async () => {
      if (!paymentIntentId && !paymentIntentSecret) {
        setLoading(false);
        return;
      }

      let walletTopupReconciled = false;
      let isWalletTopupFlow = false;

      if (paymentIntentId && isAuthenticated) {
        const maxAttempts = 12;
        let delayMs = 0;
        for (let i = 0; i < maxAttempts; i++) {
          if (delayMs > 0) {
            await new Promise(r => setTimeout(r, delayMs));
          }
          try {
            const r = await reconcileWalletTopupRequest(paymentIntentId);
            if (r.outcome === "not_wallet_topup") {
              break;
            }
            isWalletTopupFlow = true;
            if (r.outcome === "credited" || r.outcome === "already_credited") {
              walletTopupReconciled = true;
              await fetchWalletStatus().catch(() => undefined);
              break;
            }
            if (
              r.outcome === "not_succeeded" ||
              r.outcome === "transaction_not_found"
            ) {
              delayMs = delayMs === 0 ? 500 : Math.min(4000, delayMs * 2);
              continue;
            }
            break;
          } catch (e) {
            console.warn("[success] wallet topup reconcile:", e);
            delayMs = delayMs === 0 ? 500 : Math.min(4000, delayMs * 2);
          }
        }
        if (isWalletTopupFlow && !walletTopupReconciled) {
          setTopupStillProcessing(true);
        }
      }

      if (paymentIntentId && isAuthenticated && !isWalletTopupFlow) {
        try {
          const raw = sessionStorage.getItem(COMMUNITY_SUBSCRIBE_CTX_KEY);
          if (raw) {
            const { communityId } = JSON.parse(raw) as { communityId?: string };
            if (communityId) {
              const maxAttempts = 12;
              let delayMs = 0;
              for (let i = 0; i < maxAttempts; i++) {
                if (delayMs > 0) {
                  await new Promise(r => setTimeout(r, delayMs));
                }
                try {
                  if (!isAuthenticated) break;
                  const r = await reconcileCommunitySubscribeAction(
                    undefined,
                    communityId,
                    paymentIntentId
                  );
                  if (!r.success) break;
                  const payload = r.data as {
                    outcome?: string;
                    stripeStatus?: string;
                  };
                  if (
                    payload.outcome === "credited" ||
                    payload.outcome === "already_credited"
                  ) {
                    break;
                  }
                  if (payload.outcome === "not_succeeded") {
                    delayMs = delayMs === 0 ? 500 : Math.min(4000, delayMs * 2);
                    continue;
                  }
                  break;
                } catch {
                  delayMs = delayMs === 0 ? 500 : Math.min(4000, delayMs * 2);
                }
              }
            }
            sessionStorage.removeItem(COMMUNITY_SUBSCRIBE_CTX_KEY);
          }
        } catch {
          sessionStorage.removeItem(COMMUNITY_SUBSCRIBE_CTX_KEY);
        }
      }

      if (!isWalletTopupFlow) {
        dispatch(markPaymentCompleted(true));
        markPendingPaymentPrompt();
        // Keep `amount` / `textTipValue` in localStorage until the surface runs
        // useAutoDropTip or DropTip → POST /messages (createMessage + tip-animation).
        // Clearing here broke TV and any surface that returns via payment_origin.
      }

      try {
        if (readTipResumeCtx()) {
          setPendingTipAfterTopup(true);
        }
      } catch {
        /* ignore */
      }

      setLoading(false);

      const blockRedirect = isWalletTopupFlow && !walletTopupReconciled;

      if (!blockRedirect) {
        if (paymentIntentId) {
          const ownership = {
            clientSessionId: getAnalyticsSessionId(),
            ...(authUser?.role === "VISITOR"
              ? { visitorId: authUser.id }
              : authUser?.id
                ? { tipperId: authUser.id }
                : {}),
          };
          await runPaymentRecoveryExchange({
            stripePaymentIntentId: paymentIntentId,
            redirectStatus: searchParams.get("redirect_status"),
            ownership,
          });
          sanitizeSuccessUrlInHistory();
        }

        setTimeout(() => {
          const origin = localStorage.getItem(PAYMENT_ORIGIN_STORAGE_KEY);
          if (origin) {
            localStorage.removeItem(PAYMENT_ORIGIN_STORAGE_KEY);
            setPaymentPendingReturn(true);
            window.location.href = origin;
            return;
          }
          if (storedEventId) {
            router.push(`/room/${storedEventId}`);
            localStorage.removeItem("eventId");
            localStorage.removeItem("amount");
          }
        }, 1500);
      }
    };
    void loadSession();
  }, [paymentIntentId, paymentIntentSecret, router, dispatch, searchParams, authUser]);

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
          {pendingTipAfterTopup ? (
            <Paragraph
              align="center"
              size="sm"
              className="mt-3 max-w-sm"
            >
              Your wallet is topped up. You will return to your tip — complete
              payment with your wallet when ready.
            </Paragraph>
          ) : null}
          {topupStillProcessing ? (
            <Paragraph
              align="center"
              size="sm"
              className="text-muted-foreground mt-3 max-w-sm"
            >
              Top-up is still processing. Wait a moment and refresh this page,
              or check your wallet balance on your profile.
            </Paragraph>
          ) : null}
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
