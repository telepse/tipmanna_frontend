"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import {
  createVideoCoOwnerInviteAction,
  getVideoCoOwnerInviteStatusAction,
  resendVideoCoOwnerInviteAction,
  revokeVideoCoOwnerInviteAction,
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
import {
  COOWNER_RESEND_MAX_COUNT,
  COOWNER_RESEND_MIN_INTERVAL_MINUTES,
} from "@/lib/coowner-config";
import { useHostSubscriptionPrompt } from "@/hooks/use-host-subscription-prompt";
import {
  activeCoOwnerInviteRow,
  coOwnerInvitePhaseFromRows,
} from "@/lib/coowner-invite-phase.util";

export type CoOwnerInvitePhase =
  | "idle"
  | "typing"
  | "pending"
  | "approved"
  | "declined"
  | "expired"
  | "revoked";

type InviteRow = {
  id: string;
  coOwnerName: string;
  coOwnerEmail: string;
  payoutPercentBp: number;
  status: string;
  expiresAt?: string;
  resentAt?: string | null;
  resendCount?: number;
  youtubeLink?: string | null;
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
  refreshToken?: number;
};

function sliceFromInvite(row: InviteRow): CoOwnerDraftSlice {
  return {
    name: row.coOwnerName,
    email: row.coOwnerEmail,
    payoutPercent: Math.round(row.payoutPercentBp / 100),
  };
}

/**
 * Single source of truth for co-owner draft fields, hydration, and invite locking.
 */
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
  const { restoreReady, setCoOwnerHydrating } = useCoOwnerDraftLifecycle();
  const { handleSubscriptionActionError, SubscriptionPromptModal } =
    useHostSubscriptionPrompt({ focusTier: "premium" });

  const [invitePhase, setInvitePhase] = useState<CoOwnerInvitePhase>("idle");
  const [readOnlyInvite, setReadOnlyInvite] = useState(false);
  const [pending, setPending] = useState(false);
  const [resending, setResending] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [activeInvite, setActiveInvite] = useState<InviteRow | null>(null);

  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    name?: string;
  }>({});

  const hydrationRequestRef = useRef(0);

  /*
   * Keep callback references stable so effects do not depend on the
   * inline callbacks passed from CoOwnerInviteBlock.
   */
  const setCoOwnerRef = useRef(setCoOwner);
  const setDraftKeyRef = useRef(setDraftKey);
  const onDraftSaveNowRef = useRef(onDraftSaveNow);
  const onCoOwnerInvitePendingRef = useRef(onCoOwnerInvitePending);
  const onRefreshSubmitReadinessRef = useRef(onRefreshSubmitReadiness);

  setCoOwnerRef.current = setCoOwner;
  setDraftKeyRef.current = setDraftKey;
  onDraftSaveNowRef.current = onDraftSaveNow;
  onCoOwnerInvitePendingRef.current = onCoOwnerInvitePending;
  onRefreshSubmitReadinessRef.current = onRefreshSubmitReadiness;

  /*
   * Prevent draft-key initialization from happening more than once
   * for the same mounted hook instance.
   */
  const draftKeyInitializationRef = useRef(false);

  /*
   * Keep the latest draft key available to the initialization effect.
   */
  const draftKeyRef = useRef(draftKey);

  useEffect(() => {
    draftKeyRef.current = draftKey;
  }, [draftKey]);

  const patchCoOwner = useCallback(
    (patch: Partial<CoOwnerDraftSlice>) => {
      setCoOwnerRef.current({
        name: coOwner?.name ?? "",
        email: coOwner?.email ?? "",
        payoutPercent: coOwner?.payoutPercent ?? 25,
        ...patch,
      });
    },
    [coOwner]
  );

  const name = coOwner?.name ?? "";
  const email = coOwner?.email ?? "";
  const pct = coOwner?.payoutPercent ?? 25;

  /*
   * ------------------------------------------------------------
   * INITIALIZE CO-OWNER DRAFT KEY
   * ------------------------------------------------------------
   *
   * This must be strictly one-time for a mounted co-owner block.
   * Otherwise setting the RHF value can cause the parent form to
   * rerender while this effect is still participating in the
   * co-owner lifecycle.
   */
  useEffect(() => {
    if (!restoreReady || ownershipAnswer !== "no") {
      return;
    }

    if (draftKeyInitializationRef.current) {
      return;
    }

    const current = draftKeyRef.current?.trim();

    if (current) {
      draftKeyInitializationRef.current = true;
      return;
    }

    draftKeyInitializationRef.current = true;

    const next = ensureCoOwnerDraftKey();

    setDraftKeyRef.current(next);
    draftKeyRef.current = next;
  }, [restoreReady, ownershipAnswer]);

  /*
   * ------------------------------------------------------------
   * HYDRATE EXISTING INVITE
   * ------------------------------------------------------------
   */
  useEffect(() => {
    const dk = draftKey?.trim();

    if (!restoreReady || !dk || ownershipAnswer !== "no") {
      setInvitePhase("idle");
      setReadOnlyInvite(false);
      setActiveInvite(null);
      return;
    }

    hydrationRequestRef.current += 1;
    const requestId = hydrationRequestRef.current;

    let cancelled = false;
    let hydrating = true;

    setCoOwnerHydrating(true);

    const releaseHydrating = () => {
      if (!hydrating) return;
      hydrating = false;
      setCoOwnerHydrating(false);
    };

    void getVideoCoOwnerInviteStatusAction(dk).then(res => {
      releaseHydrating();

      if (cancelled || requestId !== hydrationRequestRef.current) {
        return;
      }

      if (!res.success || !res.data) {
        setInvitePhase("typing");
        setReadOnlyInvite(false);
        setActiveInvite(null);
        return;
      }

      const invites = (
        res.data as {
          invites?: InviteRow[];
        }
      ).invites;

      const phase = coOwnerInvitePhaseFromRows(invites);

      setInvitePhase(phase);

      const active = activeCoOwnerInviteRow(invites);

      setActiveInvite(active);

      if (active) {
        setCoOwnerRef.current(sliceFromInvite(active));

        setReadOnlyInvite(
          active.status === "pending" ||
            active.status === "approved" ||
            active.status === "expired"
        );

        return;
      }

      setReadOnlyInvite(false);
    });

    return () => {
      cancelled = true;
      hydrationRequestRef.current += 1;
      releaseHydrating();
    };
  }, [
    draftKey,
    restoreReady,
    ownershipAnswer,
    refreshToken,
    setCoOwnerHydrating,
  ]);

  const statusIndicator: CoOwnerInviteStatusValue =
    invitePhase === "pending"
      ? "pending"
      : invitePhase === "approved"
        ? "approved"
        : invitePhase === "declined"
          ? "declined"
          : invitePhase === "expired"
            ? "expired"
            : invitePhase === "revoked"
              ? "revoked"
              : null;

  const canResend =
    (invitePhase === "expired" ||
      invitePhase === "declined" ||
      invitePhase === "revoked" ||
      (invitePhase === "pending" && Boolean(activeInvite?.id))) &&
    (activeInvite?.resendCount ?? 0) < COOWNER_RESEND_MAX_COUNT;

  const [resendCooldownSec, setResendCooldownSec] = useState(0);

  useEffect(() => {
    const resentAt = activeInvite?.resentAt;
    if (!resentAt) {
      setResendCooldownSec(0);
      return;
    }
    const minMs = COOWNER_RESEND_MIN_INTERVAL_MINUTES * 60_000;
    const tick = () => {
      const remaining = Math.ceil(
        (minMs - (Date.now() - new Date(resentAt).getTime())) / 1000
      );
      setResendCooldownSec(Math.max(0, remaining));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [activeInvite?.resentAt]);

  const canResendNow = canResend && resendCooldownSec <= 0;

  const sendInvite = useCallback(async () => {
    if (
      readOnlyInvite &&
      invitePhase !== "expired" &&
      invitePhase !== "declined"
    ) {
      return;
    }

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

    if (!youtubeLink.trim()) {
      toast.error("Add the YouTube video link before inviting a co-owner");
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
      if (handleSubscriptionActionError(res, { focusTier: "premium" })) {
        return;
      }

      const body = res.validationBody as
        | {
            error?: {
              code?: string;
              inviteId?: string;
            };
          }
        | undefined;

      if (body?.error?.code === "invite_resendable" && body.error.inviteId) {
        const inviteId = body.error.inviteId;
        setActiveInvite({
          id: inviteId,
          coOwnerName: name.trim(),
          coOwnerEmail: email.trim(),
          payoutPercentBp: Math.round(pct * 100),
          status: "expired",
        });

        setInvitePhase("expired");

        toast.info("An invite already exists — use Resend invitation");

        return;
      }

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

    const inv = (
      res.data as {
        invite?: {
          id?: string;
        };
      }
    )?.invite;

    toast.success("Invite sent — co-owner must approve via email");

    setReadOnlyInvite(true);
    setInvitePhase("pending");

    if (inv?.id) {
      onCoOwnerInvitePendingRef.current?.(inv.id);
    }

    onRefreshSubmitReadinessRef.current?.();

    await onDraftSaveNowRef.current?.();
  }, [
    readOnlyInvite,
    invitePhase,
    canInvite,
    draftKey,
    email,
    name,
    pct,
    videoTitle,
    youtubeLink,
  ]);

  const resendInvite = useCallback(async () => {
    if (!activeInvite?.id) {
      toast.error("No invite to resend");
      return;
    }

    if (!youtubeLink.trim()) {
      toast.error("Add the YouTube video link before resending the invite");
      return;
    }

    setResending(true);

    const res = await resendVideoCoOwnerInviteAction(activeInvite.id, {
      contentTitle: videoTitle.trim(),
      youtubeLink: youtubeLink.trim(),
    });

    setResending(false);

    if (!res.success) {
      toast.error(res.message ?? "Resend failed");
      return;
    }

    const inv = (
      res.data as {
        invite?: InviteRow & { status?: string };
      }
    )?.invite;

    toast.success("Invitation resent");

    setInvitePhase("pending");
    setReadOnlyInvite(true);

    if (inv?.id) {
      setActiveInvite({
        id: inv.id,
        coOwnerName: name.trim(),
        coOwnerEmail: email.trim(),
        payoutPercentBp: Math.round(pct * 100),
        status: "pending",
        expiresAt:
          typeof inv.expiresAt === "string"
            ? inv.expiresAt
            : inv.expiresAt != null
              ? String(inv.expiresAt)
              : undefined,
        resentAt:
          typeof inv.resentAt === "string"
            ? inv.resentAt
            : inv.resentAt != null
              ? String(inv.resentAt)
              : new Date().toISOString(),
        resendCount: inv.resendCount ?? (activeInvite?.resendCount ?? 0) + 1,
        youtubeLink: inv.youtubeLink ?? youtubeLink.trim(),
      });
    }

    onRefreshSubmitReadinessRef.current?.();

    await onDraftSaveNowRef.current?.();
  }, [
    activeInvite?.id,
    activeInvite?.resendCount,
    videoTitle,
    youtubeLink,
    name,
    email,
    pct,
  ]);

  const removeInvite = useCallback(async () => {
    if (!activeInvite?.id) {
      toast.error("No invite to remove");
      return;
    }

    if (invitePhase === "pending") {
      const ok = window.confirm(
        "Remove this pending invitation? The co-owner will no longer be able to approve it."
      );
      if (!ok) return;
    }

    setRemoving(true);
    const res = await revokeVideoCoOwnerInviteAction(activeInvite.id);
    setRemoving(false);

    if (!res.success) {
      toast.error(res.message ?? "Could not remove invite");
      return;
    }

    toast.success("Invitation removed");
    setActiveInvite(null);
    setInvitePhase("typing");
    setReadOnlyInvite(false);
    onRefreshSubmitReadinessRef.current?.();
    await onDraftSaveNowRef.current?.();
  }, [activeInvite?.id, invitePhase]);

  const canRemove =
    invitePhase === "pending" ||
    invitePhase === "expired" ||
    invitePhase === "declined";

  return {
    name,
    email,
    pct,
    readOnlyInvite,
    invitePhase,
    pending,
    resending,
    removing,
    canResend: canResendNow,
    resendCooldownSec,
    activeInvite,
    fieldErrors,
    sendInvite,
    resendInvite,
    removeInvite,
    canRemove,

    statusIndicatorClass: coOwnerStatusIndicatorClass(statusIndicator),

    inviteStatusLabel: statusIndicator,

    SubscriptionPromptModal,

    setName: (value: string) => patchCoOwner({ name: value }),

    setEmail: (value: string) => patchCoOwner({ email: value }),

    setPct: (value: number) => patchCoOwner({ payoutPercent: value }),
  };
}
