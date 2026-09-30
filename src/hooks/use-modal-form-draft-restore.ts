"use client";

import { useEffect, useRef, useState } from "react";
import type { DefaultValues, UseFormReturn } from "react-hook-form";
import type { AddVideoFormValues } from "@/components/events/add-video-form";
import { toast } from "react-toastify";
import {
  getFormDraftAction,
  deleteFormDraftAction,
  type FormDraftKind,
} from "@/actions/form-drafts";
import {
  mergeModalDraftPayload,
  modalDraftStorageKey,
  modalVerifyStateFromPolicy,
} from "@/lib/form-draft-utils";

type Options = {
  kind: FormDraftKind;
  targetId: string;
  enabled?: boolean;
  form: UseFormReturn<AddVideoFormValues>;
  draftId: string | null;
  seedDraftId?: string | null;
  onDraftId: (id: string | null) => void;
  onVerifyStateRestored?: (
    state: "idle" | "checking" | "verified" | "failed"
  ) => void;
};

/** Resolve draft id for a one-shot modal restore attempt (seed > draftId > session). */
export function resolveModalDraftRestoreId(input: {
  seedDraftId?: string | null;
  draftId?: string | null;
  sessionStoredId?: string | null;
}): string | null {
  const id =
    input.seedDraftId?.trim() ||
    input.draftId?.trim() ||
    input.sessionStoredId?.trim() ||
    "";
  return id || null;
}

/** Restore modal add-video draft from sessionStorage + server on open (once per mount). */
export function useModalFormDraftRestore({
  kind,
  targetId,
  enabled = true,
  form,
  draftId,
  seedDraftId,
  onDraftId,
  onVerifyStateRestored,
}: Options) {
  const restoredRef = useRef(false);
  const [restoring, setRestoring] = useState(false);
  // Freeze first-open seed so later autosave draftId updates cannot re-trigger restore.
  const seedOnOpenRef = useRef(seedDraftId);
  const draftIdOnOpenRef = useRef(draftId);

  useEffect(() => {
    if (!enabled || !targetId?.trim() || restoredRef.current) {
      setRestoring(false);
      return;
    }

    // One-shot: mark attempted even when there is no id, so autosave cannot wipe the form.
    restoredRef.current = true;

    const storageKey = modalDraftStorageKey(kind, targetId);
    const storedId = resolveModalDraftRestoreId({
      seedDraftId: seedOnOpenRef.current,
      draftId: draftIdOnOpenRef.current,
      sessionStoredId:
        typeof window !== "undefined"
          ? sessionStorage.getItem(storageKey)
          : null,
    });

    if (!storedId) {
      setRestoring(false);
      return;
    }

    setRestoring(true);
    void getFormDraftAction(storedId).then(res => {
      setRestoring(false);
      if (!res.success || !res.data) {
        restoredRef.current = false;
        toast.error(res.message ?? "Could not load draft");
        return;
      }
      const draft = res.data;
      if (draft.kind !== kind) {
        restoredRef.current = false;
        toast.error("This draft belongs to a different form");
        return;
      }
      const merged = mergeModalDraftPayload(
        draft.payloadJson,
        draft.policyJson
      ) as DefaultValues<AddVideoFormValues>;
      form.reset(merged);
      onDraftId(draft.id);
      const verifyState = modalVerifyStateFromPolicy(
        draft.policyJson,
        merged.url ?? "",
        merged.hostYoutubeSlot ?? "none"
      );
      if (verifyState !== "idle") {
        onVerifyStateRestored?.(verifyState);
      }
      if (typeof window !== "undefined") {
        sessionStorage.setItem(storageKey, draft.id);
      }
      toast.success("Draft restored");
    });
    // Intentionally omit draftId/seedDraftId: restore is one-shot per open.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot on enable/target
  }, [enabled, targetId, kind, form, onDraftId, onVerifyStateRestored]);

  return { restoring };
}

export async function clearModalFormDraft(
  kind: FormDraftKind,
  targetId: string,
  draftId: string | null
): Promise<boolean> {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(modalDraftStorageKey(kind, targetId));
  }
  if (draftId) {
    const res = await deleteFormDraftAction(draftId);
    if (!res.success) {
      toast.error(res.message ?? "Could not delete draft");
      return false;
    }
  }
  return true;
}
