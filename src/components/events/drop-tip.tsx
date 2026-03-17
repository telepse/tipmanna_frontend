/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useCallback } from "react";

// Third-party imports
import { Button } from "@/components/ui/button";
import { useSelector, useDispatch } from "react-redux";

// Local imports
import { RootState } from "@/redux/store";
import { setSelectedTips, markPaymentCompleted } from "@/features/tip-slice";

export const DropTip = ({ eventId }: { eventId: string }) => {
  const [tipDropped, setTipDropped] = useState(false);
  const { paymentCompleted, selectedTips } = useSelector(
    (state: RootState) => state.tip
  );

  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);

  // ---------------------------------------------
  // Shared drop logic (manual + auto)
  // ---------------------------------------------
  const runDropTip = useCallback(() => {
    if (tipDropped) return;

    const amount = localStorage.getItem("amount");
    if (!amount || Number(amount) <= 0) return;

    const textTipValue = localStorage.getItem("textTipValue") || "";
    const sender = (user as any)?.anonymous ? "Anonymous" : user?.username;

    // ---- NEW: summarize selected tips ----
    const tipCounts: Record<string, number> = {};
    selectedTips.forEach(tip => {
      tipCounts[tip] = (tipCounts[tip] || 0) + 1;
    });
    const purchasedSummary = Object.entries(tipCounts)
      .map(([name, qty]) => `${qty} ${name}`)
      .join(", ");

    window.dispatchEvent(
      new CustomEvent("tip:dropped", {
        detail: {
          amount: Number(amount),
          sender,
          textTip: textTipValue,
          eventId,
          selectedTips,
          purchasedSummary,
        },
      })
    );

    dispatch(setSelectedTips([]));
    dispatch(markPaymentCompleted(false));

    setTipDropped(true);
  }, [tipDropped, user, eventId, selectedTips, dispatch]);

  // ---------------------------------------------
  // AUTO-DROP TIP AFTER 10 SECONDS
  // ---------------------------------------------
  useEffect(() => {
    if (!paymentCompleted || tipDropped) return;

    const timer = setTimeout(() => {
      runDropTip(); // auto drop
    }, 4000); // 2 seconds

    return () => clearTimeout(timer);
  }, [paymentCompleted, tipDropped, runDropTip]);

  // ---------------------------------------------
  // Listen for manual dropping
  // ---------------------------------------------
  useEffect(() => {
    const handler = () => setTipDropped(true);
    window.addEventListener("tip:dropped", handler);
    return () => window.removeEventListener("tip:dropped", handler);
  }, []);

  // ---------------------------------------------
  // Manual button click
  // ---------------------------------------------
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
