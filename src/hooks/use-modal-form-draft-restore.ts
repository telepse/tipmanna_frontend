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
} from "@/lib/form-draft-utils";

type Options = {
  kind: FormDraftKind;
  targetId: string;
  enabled?: boolean;
  form: UseFormReturn<AddVideoFormValues>;
  draftId: string | null;
  seedDraftId?: string | null;
  onDraftId: (id: string | null) => void;
};

/** Restore modal add-video draft from sessionStorage + server on open. */
export function useModalFormDraftRestore({
  kind,
  targetId,
  enabled = true,
  form,
  draftId,
  seedDraftId,
  onDraftId,
}: Options) {
  const restoredRef = useRef(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (!enabled || !targetId?.trim() || restoredRef.current) {
      setRestoring(false);
      return;
    }

    const storageKey = modalDraftStorageKey(kind, targetId);
    const storedId =
      seedDraftId?.trim() ??
      draftId ??
      (typeof window !== "undefined"
        ? sessionStorage.getItem(storageKey)
        : null);
    if (!storedId?.trim()) {
      setRestoring(false);
      return;
    }

    restoredRef.current = true;
    setRestoring(true);
    void getFormDraftAction(storedId).then(res => {
      setRestoring(false);
      if (!res.success || !res.data) return;
      const draft = res.data;
      if (draft.kind !== kind) return;
      const merged = mergeModalDraftPayload(
        draft.payloadJson,
        draft.policyJson
      ) as DefaultValues<AddVideoFormValues>;
      form.reset(merged);
      onDraftId(draft.id);
      if (typeof window !== "undefined") {
        sessionStorage.setItem(storageKey, draft.id);
      }
      toast.success("Draft restored");
    });
  }, [enabled, targetId, kind, form, draftId, seedDraftId, onDraftId]);

  return { restoring };
}

export async function clearModalFormDraft(
  kind: FormDraftKind,
  targetId: string,
  draftId: string | null
): Promise<void> {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(modalDraftStorageKey(kind, targetId));
  }
  if (draftId) {
    await deleteFormDraftAction(draftId);
  }
}
