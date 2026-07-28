"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import {
  createVideoCoOwnerInviteAction,
  getVideoCoOwnerInviteStatusAction,
} from "@/actions/events";
import { mapCoOwnerInviteErrors } from "@/lib/coowner-invite-error.util";
import {
  coOwnerStatusIndicatorClass,
  type CoOwnerInviteStatusValue,
} from "@/hooks/use-coowner-invite-status";
import {
  ensureCoOwnerDraftKey,
  type CoOwnerDraftSlice,
} from "@/lib/form-draft-utils";
import { useCoOwnerDraftLifecycle } from "@/providers/co-owner-draft-lifecycle-provider";

export type CoOwnerInvitePhase =
  | "idle"
  | "typing"
  | "pending"
  | "approved"
  | "declined";

type InviteRow = {
  coOwnerName: string;
  coOwnerEmail: string;
  payoutPercentBp: number;
  status: string;
};

export type UseCoOwnerDraftFieldsOptions = {
  draftKey: string | null | undefined;
  ownershipAnswer: "yes" | "no" | undefined;
  coOwner: CoOwnerDraftSlice | undefined;
  setCoOwner: (values: CoOwnerDraftSlice) => void;
  setDraftKey: (key: string) => void;
  videoTitle: string;
  youtubeLink: string;
  canInvite: boolean;
  onCoOwnerInvitePending?: (inviteId: string) => void;
  onDraftSaveNow?: () => void | Promise<void>;
  onRefreshSubmitReadiness?: () => void;
  /** Increment to re-fetch invite status (e.g. after Pusher approval). */
  refreshToken?: number;
};

function invitePhaseFromRows(
  invites: InviteRow[] | undefined
): CoOwnerInvitePhase {
  if (!invites?.length) return "typing";
  if (invites.some(i => i.status === "pending")) return "pending";
  if (invites.some(i => i.status === "approved")) return "approved";
  if (invites.some(i => i.status === "declined")) return "declined";
  return "typing";
}

function activeInviteRow(invites: InviteRow[] | undefined): InviteRow | null {
  if (!invites?.length) return null;
  return (
    invites.find(i => i.status === "approved" || i.status === "pending") ?? null
  );
}

function sliceFromInvite(row: InviteRow): CoOwnerDraftSlice {
  return {
    name: row.coOwnerName,
    email: row.coOwnerEmail,
    payoutPercent: Math.round(row.payoutPercentBp / 100),
  };
}

/** Single source of truth for co-owner draft fields, hydration, and invite locking. */
export function useCoOwnerDraftFields({
  draftKey,
  ownershipAnswer,
  coOwner,
  setCoOwner,
  setDraftKey,
  videoTitle,
  youtubeLink,
  canInvite,
  onCoOwnerInvitePending,
  onDraftSaveNow,
  onRefreshSubmitReadiness,
  refreshToken = 0,
}: UseCoOwnerDraftFieldsOptions) {
  const { lifecycleReady, setCoOwnerHydrating } = useCoOwnerDraftLifecycle();
  const [invitePhase, setInvitePhase] = useState<CoOwnerInvitePhase>("idle");
  const [readOnlyInvite, setReadOnlyInvite] = useState(false);
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    name?: string;
  }>({});
  const hydrationRequestRef = useRef(0);

  const patchCoOwner = useCallback(
    (patch: Partial<CoOwnerDraftSlice>) => {
      setCoOwner({
        name: coOwner?.name ?? "",
        email: coOwner?.email ?? "",
        payoutPercent: coOwner?.payoutPercent ?? 25,
        ...patch,
      });
    },
    [coOwner, setCoOwner]
  );

  const name = coOwner?.name ?? "";
  const email = coOwner?.email ?? "";
  const pct = coOwner?.payoutPercent ?? 25;

  useEffect(() => {
    if (!lifecycleReady || ownershipAnswer !== "no") return;
    const current = draftKey?.trim();
    if (!current) {
      const next = ensureCoOwnerDraftKey();
      setDraftKey(next);
    }
  }, [lifecycleReady, ownershipAnswer, draftKey, setDraftKey]);

  useEffect(() => {
    const dk = draftKey?.trim();
    if (!lifecycleReady || !dk || ownershipAnswer !== "no") {
      setInvitePhase("idle");
      setReadOnlyInvite(false);
      return;
    }

    hydrationRequestRef.current += 1;
    const requestId = hydrationRequestRef.current;
    setCoOwnerHydrating(true);

    void getVideoCoOwnerInviteStatusAction(dk).then(res => {
      if (requestId !== hydrationRequestRef.current) return;
      setCoOwnerHydrating(false);

      if (!res.success || !res.data) {
        setInvitePhase("typing");
        setReadOnlyInvite(false);
        return;
      }

      const invites = (res.data as { invites?: InviteRow[] }).invites;
      const phase = invitePhaseFromRows(invites);
      setInvitePhase(phase);

      const active = activeInviteRow(invites);
      if (active) {
        setCoOwner(sliceFromInvite(active));
        setReadOnlyInvite(true);
        return;
      }

      setReadOnlyInvite(false);
    });

    return () => {
      hydrationRequestRef.current += 1;
    };
  }, [
    draftKey,
    lifecycleReady,
    ownershipAnswer,
    setCoOwner,
    setCoOwnerHydrating,
    refreshToken,
  ]);

  const statusIndicator: CoOwnerInviteStatusValue =
    invitePhase === "pending"
      ? "pending"
      : invitePhase === "approved"
        ? "approved"
        : invitePhase === "declined"
          ? "declined"
          : null;

  const sendInvite = useCallback(async () => {
    if (readOnlyInvite) return;
    if (!canInvite) {
      toast.error(
        "Upgrade to Host Premium or Host Community to invite co-owners."
      );
      return;
    }
    const dk = draftKey?.trim();
    if (!dk) {
      toast.error("Missing session or draft id");
      return;
    }
    if (!email.trim()) {
      toast.error("Co-owner email is required");
      return;
    }
    if (!name.trim()) {
      toast.error("Co-owner legal name is required");
      return;
    }

    setPending(true);
    setFieldErrors({});
    const res = await createVideoCoOwnerInviteAction({
      draftKey: dk,
      coOwnerName: name.trim(),
      coOwnerEmail: email.trim(),
      payoutPercentBp: Math.round(pct * 100),
      contentTitle: videoTitle.trim(),
      youtubeLink: youtubeLink.trim(),
    });
    setPending(false);

    if (!res.success) {
      const mapped = mapCoOwnerInviteErrors(
        res.validationBody,
        res.message ?? undefined
      );
      if (Object.keys(mapped).length > 0) {
        setFieldErrors(mapped);
      } else {
        toast.error(res.message ?? "Invite failed");
      }
      return;
    }

    const inv = (res.data as { invite?: { id?: string } })?.invite;
    toast.success("Invite sent — co-owner must approve via email");
    setReadOnlyInvite(true);
    setInvitePhase("pending");
    if (inv?.id) onCoOwnerInvitePending?.(inv.id);
    onRefreshSubmitReadiness?.();
    await onDraftSaveNow?.();
  }, [
    readOnlyInvite,
    canInvite,
    draftKey,
    email,
    name,
    pct,
    videoTitle,
    youtubeLink,
    onCoOwnerInvitePending,
    onRefreshSubmitReadiness,
    onDraftSaveNow,
  ]);

  return {
    name,
    email,
    pct,
    readOnlyInvite,
    invitePhase,
    pending,
    fieldErrors,
    sendInvite,
    statusIndicatorClass: coOwnerStatusIndicatorClass(statusIndicator),
    inviteStatusLabel: statusIndicator,
    setName: (value: string) => patchCoOwner({ name: value }),
    setEmail: (value: string) => patchCoOwner({ email: value }),
    setPct: (value: number) => patchCoOwner({ payoutPercent: value }),
  };
}
