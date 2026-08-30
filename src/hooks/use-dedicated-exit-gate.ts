"use client";

import { useCallback, useRef, useState } from "react";

type Options = {
  sideChickLocked: boolean;
  dedicatedCommunityName: string;
  exitDedicatedMode: () => Promise<boolean>;
  /** When true, reload the page after exit (Explore activate flow uses this). */
  reloadAfterExit?: boolean;
};

export function useDedicatedExitGate({
  sideChickLocked,
  dedicatedCommunityName,
  exitDedicatedMode,
  reloadAfterExit = true,
}: Options) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);

  const requestExitThen = useCallback(
    (action: () => void) => {
      if (!sideChickLocked) {
        action();
        return;
      }
      pendingActionRef.current = action;
      setConfirmOpen(true);
    },
    [sideChickLocked]
  );

  const confirmExit = useCallback(async () => {
    setBusy(true);
    try {
      const ok = await exitDedicatedMode();
      if (!ok) return;
      const action = pendingActionRef.current;
      pendingActionRef.current = null;
      setConfirmOpen(false);
      if (action) action();
      if (reloadAfterExit) {
        window.location.reload();
      }
    } finally {
      setBusy(false);
    }
  }, [exitDedicatedMode, reloadAfterExit]);

  const cancelExit = useCallback(() => {
    pendingActionRef.current = null;
    setConfirmOpen(false);
  }, []);

  return {
    confirmOpen,
    setConfirmOpen,
    busy,
    dedicatedCommunityName,
    requestExitThen,
    confirmExit,
    cancelExit,
  };
}
