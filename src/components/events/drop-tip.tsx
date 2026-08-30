/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useCallback } from "react";

// Third-party imports
import { Button } from "@/components/ui/button";
import { useSelector, useDispatch } from "react-redux";

// Local imports
import { RootState } from "@/redux/store";
import { setSelectedTips, markPaymentCompleted } from "@/features/tip-slice";
import { ANIMATION_DURATION } from "@/lib/animationContract";
import { notifyTextTipDraftSync } from "@/lib/tip-text-selection";
import { schedulePwaPromptAfterPaymentWithPolicy } from "@/lib/pwa-install-trigger";
import { readPendingTipBroadcast } from "@/lib/payment-origin";
import {
  isPaidTipDeliveryComplete,
  isPaidTipMessageSent,
  isTipDroppedForTransaction,
  markTipDroppedForTransaction,
  resolvePaidTipTransactionId,
} from "@/lib/post-paid-tip-message-once";

export const DropTip = ({ eventId }: { eventId: string }) => {
  const [tipDropped, setTipDropped] = useState(false);
  const { paymentCompleted, selectedTips } = useSelector(
    (state: RootState) => state.tip
  );

  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    if (!paymentCompleted || tipDropped) return;
    if (isPaidTipDeliveryComplete()) {
      setTipDropped(true);
      dispatch(markPaymentCompleted(false));
    }
  }, [paymentCompleted, tipDropped, dispatch]);

  const runDropTip = useCallback(() => {
    if (tipDropped) return;

    const amount = localStorage.getItem("amount");
    if (!amount || Number(amount) <= 0) return;

    const pending = readPendingTipBroadcast();
    const tips = pending?.selectedTips?.length ? pending.selectedTips : selectedTips;
    if (!tips?.length) return;

    const transactionId = resolvePaidTipTransactionId();
    if (!transactionId) {
      dispatch(markPaymentCompleted(false));
      setTipDropped(true);
      return;
    }

    if (
      isTipDroppedForTransaction(transactionId) ||
      isPaidTipMessageSent(transactionId)
    ) {
      dispatch(markPaymentCompleted(false));
      setTipDropped(true);
      return;
    }

    markTipDroppedForTransaction(transactionId);

    const textTipValue = localStorage.getItem("textTipValue") || "";
    const sender = (user as any)?.anonymous ? "Anonymous" : user?.username;

    const tipCounts: Record<string, number> = {};
    tips.forEach(tip => {
      tipCounts[tip] = (tipCounts[tip] || 0) + 1;
    });
    const purchasedSummary = Object.entries(tipCounts)
      .map(([name, qty]) => `${qty} ${name}`)
      .join(", ");

    const eventChannelId = pending?.eventChannelId?.trim() || undefined;

    window.dispatchEvent(
      new CustomEvent("tip:dropped", {
        detail: {
          amount: Number(amount),
          sender,
          textTip: textTipValue,
          eventId,
          selectedTips: tips,
          purchasedSummary,
          transactionId,
          ...(eventChannelId ? { eventChannelId } : {}),
        },
      })
    );

    const uniqueTipNames = [...new Set(tips)];
    if (uniqueTipNames.includes("Comment")) {
      const delayMs =
        ANIMATION_DURATION.payment.max * Math.max(1, uniqueTipNames.length) +
        1200;
      window.setTimeout(() => {
        try {
          localStorage.removeItem("textTipValue");
          notifyTextTipDraftSync({ clearedAfterAnimations: true });
        } catch {
          /* ignore */
        }
      }, delayMs);
    }

    dispatch(setSelectedTips([]));
    dispatch(markPaymentCompleted(false));

    void schedulePwaPromptAfterPaymentWithPolicy(
      Math.max(1, uniqueTipNames.length)
    );

    setTipDropped(true);
  }, [tipDropped, user, eventId, selectedTips, dispatch]);

  useEffect(() => {
    if (!paymentCompleted || tipDropped) return;

    const timer = setTimeout(() => {
      runDropTip();
    }, 1500);

    return () => clearTimeout(timer);
  }, [paymentCompleted, tipDropped, runDropTip]);

  useEffect(() => {
    const handler = () => setTipDropped(true);
    window.addEventListener("tip:dropped", handler);
    return () => window.removeEventListener("tip:dropped", handler);
  }, []);

  const handleDropTip = () => {
    if (!paymentCompleted || tipDropped) return;
    runDropTip();
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className={`hover:text-primary h-8 border-gray-300 text-white ${
        paymentCompleted && !tipDropped
          ? "bg-primary"
          : "cursor-not-allowed bg-black opacity-50"
      }`}
      disabled={!paymentCompleted || tipDropped}
      onClick={handleDropTip}
    >
      Drop Tip
    </Button>
  );
};
