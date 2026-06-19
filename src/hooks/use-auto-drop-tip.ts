/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { setSelectedTips, markPaymentCompleted } from "@/features/tip-slice";
import {
  readPendingTipBroadcast,
  clearPendingTipBroadcast,
} from "@/lib/payment-origin";
import { sendTipMessageClient } from "@/lib/send-tip-message-client";
import { ANIMATION_DURATION } from "@/lib/animationContract";
import { notifyTextTipDraftSync } from "@/lib/tip-text-selection";
import { schedulePwaPromptAfterPaymentAnimation } from "@/lib/pwa-install-trigger";

const DROP_DELAY_MS = 1500;

/**
 * After Stripe success + redirect back (non–Event Room surfaces): posts the tip message via
 * direct client fetch so the backend broadcasts `tip-animation`. Skips POST if /success already
 * sent (`tipMessageSent` in localStorage).
 */
export function useAutoDropTip(eventId: string, enabled = true): void {
  const dispatch = useDispatch();
  const { paymentCompleted, selectedTips } = useSelector(
    (s: RootState) => s.tip
  );
  const user = useSelector((s: RootState) => s.auth.user);

  const selectedTipsRef = useRef(selectedTips);
  selectedTipsRef.current = selectedTips;
  const userRef = useRef(user);
  userRef.current = user;

  const droppedRef = useRef(false);
  const prevPaymentCompletedRef = useRef(paymentCompleted);

  useEffect(() => {
    if (!paymentCompleted) {
      droppedRef.current = false;
    }
  }, [eventId, paymentCompleted]);

  useEffect(() => {
    if (prevPaymentCompletedRef.current && !paymentCompleted) {
      droppedRef.current = false;
    }
    prevPaymentCompletedRef.current = paymentCompleted;
  }, [paymentCompleted]);

  useEffect(() => {
    if (!paymentCompleted || droppedRef.current) return;

    const pendingSnapshot = readPendingTipBroadcast();
    const effectiveEventId =
      pendingSnapshot?.eventId?.trim() || eventId?.trim() || "";
    if (!effectiveEventId) return;
    if (!enabled && !pendingSnapshot) return;

    const timer = window.setTimeout(() => {
      if (droppedRef.current) return;

      const pending = readPendingTipBroadcast();
      const tips = pending?.selectedTips?.length
        ? pending.selectedTips
        : selectedTipsRef.current;
      const postEventId = pending?.eventId?.trim() || eventId?.trim() || "";

      if (!postEventId || !tips?.length) {
        dispatch(markPaymentCompleted(false));
        return;
      }

      const amountLs = localStorage.getItem("amount");
      const amount = pending?.amount ?? (amountLs ? Number(amountLs) : NaN);
      if (!amount || Number(amount) <= 0) {
        dispatch(markPaymentCompleted(false));
        return;
      }

      const textTipCombined =
        (pending?.secondaryText && String(pending.secondaryText).trim()) ||
        localStorage.getItem("textTipValue") ||
        "";
      const u = userRef.current;
      const sender = (u as any)?.anonymous
        ? "Anonymous"
        : (u?.username ?? "Anonymous");

      const tipCounts: Record<string, number> = {};
      tips.forEach((tip: string) => {
        tipCounts[tip] = (tipCounts[tip] || 0) + 1;
      });
      const purchasedSummary = Object.entries(tipCounts)
        .map(([name, qty]) => `${qty} ${name}`)
        .join(", ");

      void (async () => {
        try {
          const res = await sendTipMessageClient({
            eventId: postEventId,
            sender,
            text: "I just sent",
            tip: Number(amount),
            secondaryText: textTipCombined.trim()
              ? textTipCombined.trim()
              : undefined,
            selectedTips: tips,
            purchasedSummary,
            ...(pending?.eventChannelId?.trim()
              ? { eventChannelId: pending.eventChannelId.trim() }
              : {}),
            ...(pending?.transactionId?.trim()
              ? { transactionId: pending.transactionId.trim() }
              : {}),
          });
          if (!res.ok) {
            dispatch(markPaymentCompleted(false));
            droppedRef.current = true;
            return;
          }
        } catch {
          dispatch(markPaymentCompleted(false));
          droppedRef.current = true;
          return;
        }
        clearPendingTipBroadcast();
        try {
          localStorage.removeItem("amount");
        } catch {
          /* ignore */
        }
        const tipsUnique = [...new Set(tips)];
        if (tipsUnique.includes("Comment")) {
          const delayMs =
            ANIMATION_DURATION.payment.max * Math.max(1, tipsUnique.length) +
            1200;
          window.setTimeout(() => {
            try {
              localStorage.removeItem("textTipValue");
              notifyTextTipDraftSync({ clearedAfterAnimations: true });
            } catch {
              /* ignore */
            }
          }, delayMs);
        } else {
          try {
            localStorage.removeItem("textTipValue");
            notifyTextTipDraftSync({ clearedAfterAnimations: true });
          } catch {
            /* ignore */
          }
        }
        dispatch(setSelectedTips([]));
        dispatch(markPaymentCompleted(false));
        droppedRef.current = true;
        schedulePwaPromptAfterPaymentAnimation(
          Math.max(1, [...new Set(tips)].length)
        );
      })();
    }, DROP_DELAY_MS);

    return () => clearTimeout(timer);
  }, [enabled, eventId, paymentCompleted, dispatch]);
}
