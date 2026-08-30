"use client";

import { useEffect, useState } from "react";

import {
  readTipResumeCtx,
  readWalletTopupReturnIntent,
  clearWalletTopupReturnIntent,
} from "@/lib/payment-origin";
import {
  isPaymentPendingReturn,
  setPaymentPendingReturn,
} from "@/lib/tv-payment-snapshot";

/**
 * After /success redirects back, open the tip drawer and bump the wallet modal nonce so the
 * user sees an updated balance and can finish paying with PIN.
 * Matches `wallet_topup_return_v1` for this surface's `eventId` (even if `payment_pending_return`
 * was cleared early by TV snapshot restore), or `tip_resume_ctx_v1` when `payment_pending_return` is set.
 */
export function useWalletTopupTipResume(
  eventId: string | undefined,
  setDrawerOpen: (open: boolean) => void
): { openWalletModalNonce: number } {
  const [openWalletModalNonce, setOpenWalletModalNonce] = useState(0);

  useEffect(() => {
    if (!eventId?.trim()) return;

    const returnIntent = readWalletTopupReturnIntent();
    const ctx = readTipResumeCtx();
    const wantEventId =
      returnIntent?.eventId?.trim() || ctx?.eventId?.trim() || "";

    if (!wantEventId || wantEventId !== eventId.trim()) return;

    const pendingReturn = isPaymentPendingReturn();
    // `wallet_topup_return_v1` is enough to resume; TV snapshot restore may clear `payment_pending_return` first.
    if (!returnIntent && (!ctx || !pendingReturn)) return;

    setDrawerOpen(true);
    setOpenWalletModalNonce(n => n + 1);
    clearWalletTopupReturnIntent();
    setPaymentPendingReturn(false);
  }, [eventId, setDrawerOpen]);

  return { openWalletModalNonce };
}
