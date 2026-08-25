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
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Third-party imports
import { BeatLoader } from "react-spinners";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "@/redux/store";

// Local imports
import { Paragraph } from "@/components/shared/paragraph";
import { markPaymentCompleted } from "@/features/tip-slice";
import {
  readPendingTipBroadcast,
  readTipResumeCtx,
} from "@/lib/payment-origin";
import {
  readPendingPaymentReturn,
  patchPendingPaymentReturn,
} from "@/lib/pending-payment-return";
import { redirectAfterPaymentSuccess } from "@/lib/payment-success-redirect";
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

const REDIRECT_SETTLE_MS = 400;

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
  const authUserRef = useRef(authUser);
  authUserRef.current = authUser;
  const sessionHandledRef = useRef(false);

  useEffect(() => {
    if (sessionHandledRef.current) return;

    // Load eventId and amount from localStorage on mount
    const storedEventId = sanitizeEventIdForRoomRedirect(
      localStorage.getItem("eventId")
    );
    setEventId(storedEventId);
    const storedAmount = localStorage.getItem("amount");
    if (storedAmount) {
      setAmount(Number(storedAmount));
    }

    const buildOwnership = () => {
      const user = authUserRef.current;
      return {
        clientSessionId: getAnalyticsSessionId(),
        ...(user?.role === "VISITOR"
          ? { visitorId: user.id }
          : user?.id
            ? { tipperId: user.id }
            : {}),
      };
    };

    const loadSession = async () => {
      let blockRedirect = false;
      let shouldScheduleRedirect = false;

      try {
        if (!paymentIntentId && !paymentIntentSecret) {
          setLoading(false);
          return;
        }

        shouldScheduleRedirect = true;

        const pendingTipReturn =
          Boolean(readPendingPaymentReturn()) ||
          Boolean(readPendingTipBroadcast());

        let walletTopupReconciled = false;
        let isWalletTopupFlow = false;

        if (paymentIntentId && isAuthenticated && !pendingTipReturn) {
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
              if (
                r.outcome === "credited" ||
                r.outcome === "already_credited"
              ) {
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

        if (
          paymentIntentId &&
          isAuthenticated &&
          !isWalletTopupFlow &&
          !pendingTipReturn
        ) {
          try {
            const raw = sessionStorage.getItem(COMMUNITY_SUBSCRIBE_CTX_KEY);
            if (raw) {
              const { communityId } = JSON.parse(raw) as {
                communityId?: string;
              };
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
                      delayMs =
                        delayMs === 0 ? 500 : Math.min(4000, delayMs * 2);
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

        blockRedirect = isWalletTopupFlow && !walletTopupReconciled;

        if (!blockRedirect && paymentIntentId) {
          const exchangeResult = await runPaymentRecoveryExchange({
            stripePaymentIntentId: paymentIntentId,
            redirectStatus: searchParams.get("redirect_status"),
            ownership: buildOwnership(),
          });
          if (
            exchangeResult.outcome !== "exchanged" &&
            exchangeResult.outcome !== "skipped_no_pending"
          ) {
            patchPendingPaymentReturn({ recoveryUnavailable: true });
          }
        }
      } catch (e) {
        console.warn("[success] loadSession:", e);
        patchPendingPaymentReturn({ recoveryUnavailable: true });
        setLoading(false);
        shouldScheduleRedirect = Boolean(
          paymentIntentId || paymentIntentSecret
        );
      } finally {
        if (sessionHandledRef.current) return;
        sessionHandledRef.current = true;

        if (!shouldScheduleRedirect) return;

        if (blockRedirect) {
          sanitizeSuccessUrlInHistory();
          return;
        }

        setTimeout(() => {
          setPaymentPendingReturn(true);
          redirectAfterPaymentSuccess(router, storedEventId, paymentIntentId);
        }, REDIRECT_SETTLE_MS);
      }
    };
    void loadSession();
  }, [paymentIntentId, paymentIntentSecret, router, dispatch, isAuthenticated]);

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
