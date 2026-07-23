"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getVideoCoOwnerInviteStatusAction } from "@/actions/events";
import { evaluateCoOwnerSubmitReadiness } from "@/lib/coowner-submit-readiness.util";

type LinkSlice = {
  ownershipAnswer?: string | null;
  coOwnerDraftKey?: string | null;
};

/** True when any co-owned video link lacks an approved invite. */
export function useCoOwnerDraftSubmitBlocked(links: LinkSlice[]): {
  blocked: boolean;
  refresh: () => Promise<void>;
} {
  const coOwned = useMemo(
    () => links.filter(link => link.ownershipAnswer === "no"),
    [links]
  );
  const watchKey = useMemo(
    () =>
      coOwned
        .map(
          link => `${link.coOwnerDraftKey ?? ""}:${link.ownershipAnswer ?? ""}`
        )
        .join("|"),
    [coOwned]
  );

  const [blocked, setBlocked] = useState(() => coOwned.length > 0);

  const refresh = useCallback(async () => {
    if (coOwned.length === 0) {
      setBlocked(false);
      return;
    }

    setBlocked(true);

    for (const link of coOwned) {
      const draftKey = link.coOwnerDraftKey?.trim();
      if (!draftKey) {
        setBlocked(true);
        return;
      }

      const res = await getVideoCoOwnerInviteStatusAction(draftKey);
      if (!res.success) {
        setBlocked(true);
        return;
      }

      const invites = (res.data as { invites?: { status: string }[] } | null)
        ?.invites;
      const readiness = evaluateCoOwnerSubmitReadiness(invites);
      if (readiness.blocked) {
        setBlocked(true);
        return;
      }
    }

    setBlocked(false);
  }, [coOwned]);

  useEffect(() => {
    void refresh();
    if (coOwned.length === 0) return;
    const id = window.setInterval(() => void refresh(), 5000);
    return () => window.clearInterval(id);
  }, [refresh, coOwned.length, watchKey]);

  return { blocked, refresh };
}
