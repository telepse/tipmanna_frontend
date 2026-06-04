"use client";

import { useCallback, useEffect, useState } from "react";

import { subscribeChannel, unsubscribeChannel } from "@/lib/pusher";
import {
  fetchWalletStatus,
  type WalletStatusResponse,
} from "@/lib/wallet-client";

function isWalletRole(role: string | undefined): boolean {
  return role === "TIPPER" || role === "HOST";
}

/**
 * Shared wallet snapshot + Pusher updates for chip + dialog (one subscription per mount).
 */
export function useTipperWalletStatus(
  userId: string | undefined,
  userRole: string | undefined
): {
  status: WalletStatusResponse | null;
  refresh: () => Promise<void>;
} {
  const [status, setStatus] = useState<WalletStatusResponse | null>(null);

  const refresh = useCallback(async () => {
    if (!userId || !isWalletRole(userRole)) {
      setStatus(null);
      return;
    }
    const w = await fetchWalletStatus();
    setStatus(w);
  }, [userId, userRole]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!userId || !isWalletRole(userRole)) return;
    const chName = `tipper-wallet-${userId}`;
    const ch = subscribeChannel(chName);
    if (!ch) return;
    const onStatus = () => {
      void refresh();
    };
    ch.bind("wallet-status", onStatus);
    ch.bind("wallet-topup", onStatus);
    return () => {
      ch.unbind("wallet-status", onStatus);
      ch.unbind("wallet-topup", onStatus);
      unsubscribeChannel(chName);
    };
  }, [userId, userRole, refresh]);

  return { status, refresh };
}
