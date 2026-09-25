"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getVideoCoOwnerInviteStatusAction } from "@/actions/events";
import {
  evaluateCoOwnerSubmitReadiness,
  coOwnerDropWarningMessage,
  type CoOwnerBlockReason,
} from "@/lib/coowner-submit-readiness.util";

type LinkSlice = {
  ownershipAnswer?: string | null;
  coOwnerDraftKey?: string | null;
  title?: string | null;
};

type Options = {
  /** When true, a will-drop video blocks submit (single-video modals). */
  singleVideo?: boolean;
};

function linksFingerprint(links: LinkSlice[]): string {
  return links
    .map(
      l =>
        `${l.ownershipAnswer ?? ""}:${l.coOwnerDraftKey ?? ""}:${l.title ?? ""}`
    )
    .join(";;");
}

function coOwnedWatchKey(links: LinkSlice[]): string {
  return links
    .filter(link => link.ownershipAnswer === "no")
    .map(
      link =>
        `${link.coOwnerDraftKey ?? ""}:${link.ownershipAnswer ?? ""}:${link.title ?? ""}`
    )
    .join("|");
}

function parseCoOwnedFromWatchKey(watchKey: string): LinkSlice[] {
  if (!watchKey) return [];
  return watchKey.split("|").map(part => {
    const bits = part.split(":");
    const coOwnerDraftKey = bits[0] ?? "";
    const ownershipAnswer = bits[1] ?? "no";
    const title = bits.slice(2).join(":") || undefined;
    return { coOwnerDraftKey, ownershipAnswer, title };
  });
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
} {
  const fingerprint = linksFingerprint(links);
  const watchKey = useMemo(
    () => coOwnedWatchKey(links),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable primitive fingerprint
    [fingerprint]
  );

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

  const refresh = useCallback(
    async (opts?: { background?: boolean }) => {
      if (!watchKey) {
        refreshRequestIdRef.current += 1;
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
      let awaitingDraftKey = false;

      for (const link of coOwned) {
        const draftKey = link.coOwnerDraftKey?.trim();
        if (!draftKey) {
          nextBlocked = true;
          nextReason = null;
          allTerminal = false;
          awaitingDraftKey = true;
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
          const label = link.title?.trim() || "Co-owned video";
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

      allTerminalRef.current = allTerminal && !nextBlocked && !nextHidden;
      setBlocked(nextBlocked);
      setReason(nextReason);
      setHiddenUntilCoOwnerApprove(nextHidden);
      setWarnings(nextWarnings);
      setChecking(awaitingDraftKey);
      setRevalidating(false);
    },
    [watchKey, singleVideo]
  );

  useEffect(() => {
    allTerminalRef.current = false;
    if (!watchKey) {
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
  };
}
