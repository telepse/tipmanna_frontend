"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getVideoCoOwnerInviteStatusAction } from "@/actions/events";
import { evaluateCoOwnerSubmitReadiness } from "@/lib/coowner-submit-readiness.util";

type LinkSlice = {
  ownershipAnswer?: string | null;
  coOwnerDraftKey?: string | null;
};

function linksFingerprint(links: LinkSlice[]): string {
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
    const sep = part.indexOf(":");
    const coOwnerDraftKey = sep >= 0 ? part.slice(0, sep) : part;
    const ownershipAnswer = sep >= 0 ? part.slice(sep + 1) : "no";
    return { coOwnerDraftKey, ownershipAnswer };
  });
}

/** True when any co-owned video link lacks an approved invite. */
export function useCoOwnerDraftSubmitBlocked(links: LinkSlice[]): {
  blocked: boolean;
  checking: boolean;
  refresh: () => Promise<void>;
} {
  const fingerprint = linksFingerprint(links);
  const watchKey = useMemo(
    () => coOwnedWatchKey(links),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable primitive fingerprint
    [fingerprint]
  );

  const hasCoOwned = watchKey.length > 0;
  const [blocked, setBlocked] = useState(hasCoOwned);
  const [checking, setChecking] = useState(hasCoOwned);
  const refreshRequestIdRef = useRef(0);

  const refresh = useCallback(async () => {
    if (!watchKey) {
      setBlocked(false);
      setChecking(false);
      return;
    }

    refreshRequestIdRef.current += 1;
    const requestId = refreshRequestIdRef.current;
    setChecking(true);

    const coOwned = parseCoOwnedFromWatchKey(watchKey);
    let nextBlocked = false;

    for (const link of coOwned) {
      const draftKey = link.coOwnerDraftKey?.trim();
      if (!draftKey) {
        nextBlocked = true;
        break;
      }

      const res = await getVideoCoOwnerInviteStatusAction(draftKey);
      if (requestId !== refreshRequestIdRef.current) return;

      if (!res.success) {
        nextBlocked = true;
        break;
      }

      const invites = (res.data as { invites?: { status: string }[] } | null)
        ?.invites;
      const readiness = evaluateCoOwnerSubmitReadiness(invites);
      if (readiness.blocked) {
        nextBlocked = true;
        break;
      }
    }

    if (requestId !== refreshRequestIdRef.current) return;

    setBlocked(nextBlocked);
    setChecking(false);
  }, [watchKey]);

  useEffect(() => {
    if (!watchKey) {
      setBlocked(false);
      setChecking(false);
      return;
    }
    setBlocked(true);
    setChecking(true);
    void refresh();
    const id = window.setInterval(() => void refresh(), 5000);
    return () => window.clearInterval(id);
  }, [watchKey, refresh]);

  return { blocked, checking, refresh };
}
