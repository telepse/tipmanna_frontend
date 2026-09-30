"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getVideoCoOwnerInviteStatusAction } from "@/actions/events";
import {
  evaluateCoOwnerSubmitReadiness,
  coOwnerDropWarningMessage,
  type CoOwnerBlockReason,
} from "@/lib/coowner-submit-readiness.util";
import { applyCoOwnerRefreshResult } from "@/lib/coowner-pending-unlock.util";

type LinkSlice = {
  ownershipAnswer?: string | null;
  coOwnerDraftKey?: string | null;
  title?: string | null;
};

type Options = {
  /** When true, a will-drop video blocks submit (single-video modals). */
  singleVideo?: boolean;
};

/** Ownership + draftKey only — title churn must not retrigger status refresh. */
export function linksFingerprint(links: LinkSlice[]): string {
  return links
    .map(l => `${l.ownershipAnswer ?? ""}:${l.coOwnerDraftKey ?? ""}`)
    .join(";;");
}

function coOwnedWatchKey(links: LinkSlice[]): string {
  return links
    .filter(link => link.ownershipAnswer === "no")
    .map(link => `${link.coOwnerDraftKey ?? ""}:${link.ownershipAnswer ?? ""}`)
    .join("|");
}

function parseCoOwnedFromWatchKey(watchKey: string): LinkSlice[] {
  if (!watchKey) return [];
  return watchKey.split("|").map(part => {
    const bits = part.split(":");
    const coOwnerDraftKey = bits[0] ?? "";
    const ownershipAnswer = bits[1] ?? "no";
    return { coOwnerDraftKey, ownershipAnswer };
  });
}

function titleForDraftKey(
  links: LinkSlice[],
  draftKey: string
): string | undefined {
  const match = links.find(
    l =>
      l.ownershipAnswer === "no" &&
      (l.coOwnerDraftKey?.trim() ?? "") === draftKey
  );
  return match?.title?.trim() || undefined;
}

/** True when any co-owned video link lacks an approved invite. */
export function useCoOwnerDraftSubmitBlocked(
  links: LinkSlice[],
  { singleVideo = false }: Options = {}
): {
  blocked: boolean;
  checking: boolean;
  revalidating: boolean;
  reason: CoOwnerBlockReason | null;
  hiddenUntilCoOwnerApprove: boolean;
  warnings: string[];
  refresh: (opts?: { background?: boolean }) => Promise<void>;
  /** Unlock submit immediately after a successful invite send (pending). */
  markPendingUnlock: () => void;
} {
  const fingerprint = linksFingerprint(links);
  const watchKey = useMemo(
    () => coOwnedWatchKey(links),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable primitive fingerprint
    [fingerprint]
  );

  const linksRef = useRef(links);
  linksRef.current = links;

  const hasCoOwned = watchKey.length > 0;
  const [blocked, setBlocked] = useState(false);
  const [checking, setChecking] = useState(hasCoOwned);
  const [revalidating, setRevalidating] = useState(false);
  const [reason, setReason] = useState<CoOwnerBlockReason | null>(null);
  const [hiddenUntilCoOwnerApprove, setHiddenUntilCoOwnerApprove] =
    useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const refreshRequestIdRef = useRef(0);
  const allTerminalRef = useRef(false);
  const pendingUnlockLatchRef = useRef(false);

  const markPendingUnlock = useCallback(() => {
    // Invalidate in-flight refreshes so stale empty/failed results cannot re-lock.
    refreshRequestIdRef.current += 1;
    pendingUnlockLatchRef.current = true;
    setBlocked(false);
    setChecking(false);
    setRevalidating(false);
    setReason("has_pending");
    setHiddenUntilCoOwnerApprove(true);
    allTerminalRef.current = false;
  }, []);

  const refresh = useCallback(
    async (opts?: { background?: boolean }) => {
      if (!watchKey) {
        refreshRequestIdRef.current += 1;
        pendingUnlockLatchRef.current = false;
        setBlocked(false);
        setChecking(false);
        setRevalidating(false);
        setReason(null);
        setHiddenUntilCoOwnerApprove(false);
        setWarnings([]);
        allTerminalRef.current = true;
        return;
      }

      refreshRequestIdRef.current += 1;
      const requestId = refreshRequestIdRef.current;
      const background = opts?.background ?? false;
      if (background) {
        setRevalidating(true);
      } else {
        setChecking(true);
      }

      const coOwned = parseCoOwnedFromWatchKey(watchKey);
      let nextBlocked = false;
      let nextReason: CoOwnerBlockReason | null = null;
      let nextHidden = false;
      const nextWarnings: string[] = [];
      let allTerminal = true;
      let pendingDraftKey = false;

      for (const link of coOwned) {
        const draftKey = link.coOwnerDraftKey?.trim();
        if (!draftKey) {
          pendingDraftKey = true;
          allTerminal = false;
          continue;
        }

        const res = await getVideoCoOwnerInviteStatusAction(draftKey);
        if (requestId !== refreshRequestIdRef.current) return;

        if (!res.success) {
          nextBlocked = true;
          nextReason = "status_fetch_failed";
          allTerminal = false;
          break;
        }

        const invites = (res.data as { invites?: { status: string }[] } | null)
          ?.invites;
        const readiness = evaluateCoOwnerSubmitReadiness(invites);
        if (readiness.willDropOnSubmit) {
          const label =
            titleForDraftKey(linksRef.current, draftKey) || "Co-owned video";
          nextWarnings.push(
            `${label}: ${coOwnerDropWarningMessage("will_be_dropped")}`
          );
          if (singleVideo) {
            nextBlocked = true;
            nextReason = "will_be_dropped";
          }
          continue;
        }
        if (readiness.hiddenUntilCoOwnerApprove) {
          nextHidden = true;
          nextReason = readiness.reason;
          allTerminal = false;
          continue;
        }
        if (readiness.blocked) {
          nextBlocked = true;
          nextReason = readiness.reason;
          allTerminal = false;
          break;
        }
      }

      if (requestId !== refreshRequestIdRef.current) return;

      if (pendingDraftKey && !nextBlocked) {
        allTerminalRef.current = false;
        setBlocked(false);
        setReason(nextReason);
        setHiddenUntilCoOwnerApprove(nextHidden);
        setWarnings(nextWarnings);
        setChecking(true);
        setRevalidating(false);
        return;
      }

      const applied = applyCoOwnerRefreshResult({
        latched: pendingUnlockLatchRef.current,
        nextBlocked,
        nextHidden,
        nextReason,
        nextWarnings,
        allTerminal,
      });

      if (applied.clearLatch) {
        pendingUnlockLatchRef.current = false;
      }

      if (!applied.apply) {
        setChecking(false);
        setRevalidating(false);
        return;
      }

      allTerminalRef.current = applied.allTerminal;
      setBlocked(applied.blocked);
      setReason(applied.reason);
      setHiddenUntilCoOwnerApprove(applied.hiddenUntilCoOwnerApprove);
      setWarnings(applied.warnings);
      setChecking(false);
      setRevalidating(false);
    },
    [watchKey, singleVideo]
  );

  useEffect(() => {
    allTerminalRef.current = false;
    if (!watchKey) {
      pendingUnlockLatchRef.current = false;
      setBlocked(false);
      setChecking(false);
      setRevalidating(false);
      setReason(null);
      setHiddenUntilCoOwnerApprove(false);
      setWarnings([]);
      refreshRequestIdRef.current += 1;
      return;
    }

    void refresh({ background: false });

    const id = window.setInterval(() => {
      if (allTerminalRef.current) return;
      void refresh({ background: true });
    }, 15_000);

    return () => {
      window.clearInterval(id);
      refreshRequestIdRef.current += 1;
    };
  }, [watchKey, refresh]);

  return {
    blocked,
    checking,
    revalidating,
    reason,
    hiddenUntilCoOwnerApprove,
    warnings,
    refresh,
    markPendingUnlock,
  };
}
