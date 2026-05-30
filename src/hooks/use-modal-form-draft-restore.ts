"use client";

import { useEffect, useRef } from "react";
import type { UseFormReturn } from "react-hook-form";
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
import type { AddVideoFormValues } from "@/components/events/add-video-form";

type Options = {
  kind: Extract<FormDraftKind, "community_video" | "room_add_video">;
  targetId: string;
  enabled?: boolean;
  form: UseFormReturn<AddVideoFormValues>;
  draftId: string | null;
  onDraftId: (id: string | null) => void;
};

/** Restore modal add-video draft from sessionStorage + server on open. */
export function useModalFormDraftRestore({
  kind,
  targetId,
  enabled = true,
  form,
  draftId,
  onDraftId,
}: Options) {
  const restoredRef = useRef(false);

  useEffect(() => {
    if (!enabled || !targetId?.trim() || restoredRef.current) return;

    const storageKey = modalDraftStorageKey(kind, targetId);
    const storedId =
      draftId ??
      (typeof window !== "undefined"
        ? sessionStorage.getItem(storageKey)
        : null);
    if (!storedId?.trim()) return;

    restoredRef.current = true;
    void getFormDraftAction(storedId).then(res => {
      if (!res.success || !res.data) return;
      const draft = res.data;
      if (draft.kind !== kind) return;
      const merged = mergeModalDraftPayload(
        draft.payloadJson,
        draft.policyJson
      );
      form.reset(merged);
      onDraftId(draft.id);
      if (typeof window !== "undefined") {
        sessionStorage.setItem(storageKey, draft.id);
      }
      toast.success("Draft restored");
    });
  }, [enabled, targetId, kind, form, draftId, onDraftId]);
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
