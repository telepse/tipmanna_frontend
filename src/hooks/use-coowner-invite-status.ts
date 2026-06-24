"use client";

import { useCallback, useEffect, useState } from "react";
import { getVideoCoOwnerInviteStatusAction } from "@/actions/events";

export type CoOwnerInviteStatusValue =
  | "pending"
  | "approved"
  | "declined"
  | null;

type InviteRow = {
  coOwnerEmail: string;
  status: string;
};

export function useCoOwnerInviteStatus(
  draftKey: string | null | undefined,
  email: string | null | undefined
): CoOwnerInviteStatusValue {
  const [status, setStatus] = useState<CoOwnerInviteStatusValue>(null);

  const refresh = useCallback(async () => {
    const dk = draftKey?.trim();
    const em = email?.trim().toLowerCase();
    if (!dk || !em) {
      setStatus(null);
      return;
    }
    const res = await getVideoCoOwnerInviteStatusAction(dk);
    if (!res.success || !res.data) return;
    const invites = (
      res.data as { invites?: InviteRow[] }
    ).invites;
    const match = invites?.find(
      i => i.coOwnerEmail.trim().toLowerCase() === em
    );
    if (!match) {
      setStatus(null);
      return;
    }
    if (match.status === "approved" || match.status === "declined") {
      setStatus(match.status);
    } else {
      setStatus("pending");
    }
  }, [draftKey, email]);

  useEffect(() => {
    void refresh();
    if (!draftKey?.trim() || !email?.trim()) return;
    const id = window.setInterval(() => void refresh(), 5000);
    return () => window.clearInterval(id);
  }, [draftKey, email, refresh]);

  return status;
}

export function coOwnerStatusIndicatorClass(
  status: CoOwnerInviteStatusValue
): string {
  if (status === "approved") return "border-green-500/70 bg-green-500/10";
  if (status === "pending") return "border-amber-500/70 bg-amber-500/10";
  if (status === "declined") return "border-red-500/70 bg-red-500/10";
  return "";
}
