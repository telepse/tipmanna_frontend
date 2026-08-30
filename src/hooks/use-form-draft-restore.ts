"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { DefaultValues, UseFormReturn } from "react-hook-form";
import type { NewEventFormData } from "@/schemas";
import { toast } from "react-toastify";
import {
  deleteFormDraftAction,
  getFormDraftAction,
  listFormDraftsAction,
  type FormDraftKind,
  type FormDraftSummary,
} from "@/actions/form-drafts";
import { mergeDraftPayload } from "@/lib/form-draft-utils";

type Options = {
  kind: FormDraftKind;
  enabled?: boolean;
  onDraftId: (id: string) => void;
  onStep: (step: number) => void;
};

/** Load a saved draft when `?draftId=` is present, or offer resume from latest in-progress draft. */
export function useFormDraftRestore<
  T extends NewEventFormData = NewEventFormData,
>(
  form: UseFormReturn<T>,
  { kind, enabled = true, onDraftId, onStep }: Options
) {
  const searchParams = useSearchParams();
  const draftIdParam = searchParams.get("draftId")?.trim() ?? null;
  const [restoring, setRestoring] = useState(Boolean(draftIdParam));
  const [pendingDraft, setPendingDraft] = useState<FormDraftSummary | null>(
    null
  );
  const restoredRef = useRef(false);
  const bannerCheckedRef = useRef(false);

  const applyDraft = async (draftId: string) => {
    setRestoring(true);
    const res = await getFormDraftAction(draftId);
    setRestoring(false);
    if (!res.success || !res.data) {
      toast.error(res.message ?? "Could not load draft");
      return false;
    }
    const draft = res.data;
    if (draft.kind !== kind) {
      toast.error("This draft belongs to a different create flow");
      return false;
    }
    const merged = mergeDraftPayload(
      draft.payloadJson,
      draft.policyJson
    ) as DefaultValues<T>;
    form.reset(merged);
    onDraftId(draft.id);
    if (typeof draft.step === "number" && draft.step >= 0) {
      onStep(draft.step);
    }
    toast.success("Draft restored");
    return true;
  };

  useEffect(() => {
    if (!enabled || !draftIdParam || restoredRef.current) {
      if (!draftIdParam) setRestoring(false);
      return;
    }

    restoredRef.current = true;
    void applyDraft(draftIdParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot URL restore
  }, [draftIdParam, enabled, kind]);

  useEffect(() => {
    if (
      !enabled ||
      draftIdParam ||
      restoredRef.current ||
      bannerCheckedRef.current
    )
      return;

    bannerCheckedRef.current = true;
    void listFormDraftsAction(kind).then(res => {
      if (!res.success || !Array.isArray(res.data) || res.data.length === 0)
        return;
      const latest = res.data[0] as FormDraftSummary;
      if (latest?.id) setPendingDraft(latest);
    });
  }, [draftIdParam, enabled, kind]);

  const resume = async () => {
    if (!pendingDraft?.id) return;
    restoredRef.current = true;
    setPendingDraft(null);
    await applyDraft(pendingDraft.id);
  };

  const discard = async () => {
    if (!pendingDraft?.id) return;
    const res = await deleteFormDraftAction(pendingDraft.id);
    if (!res.success) {
      toast.error(res.message ?? "Could not delete draft");
      return;
    }
    setPendingDraft(null);
    toast.success("Draft discarded");
  };

  return {
    restoring,
    draftIdFromUrl: draftIdParam,
    pendingDraft,
    resume,
    discard,
  };
}
