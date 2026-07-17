"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getVideoCoOwnerInviteStatusAction } from "@/actions/events";

type LinkSlice = {
  ownershipAnswer?: string | null;
  coOwnerDraftKey?: string | null;
};

/** True when any co-owned video link lacks an approved invite. */
export function useCoOwnerDraftSubmitBlocked(links: LinkSlice[]): boolean {
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

  const [blocked, setBlocked] = useState(false);

  const refresh = useCallback(async () => {
    if (coOwned.length === 0) {
      setBlocked(false);
      return;
    }

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
      const hasApproved = invites?.some(i => i.status === "approved") ?? false;
      if (!hasApproved) {
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

  return blocked;
}
