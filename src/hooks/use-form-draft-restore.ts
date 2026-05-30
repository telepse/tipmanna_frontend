"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { DefaultValues, UseFormReturn } from "react-hook-form";
import type { NewEventFormData } from "@/schemas";
import { toast } from "react-toastify";
import { getFormDraftAction, type FormDraftKind } from "@/actions/form-drafts";
import { mergeDraftPayload } from "@/lib/form-draft-utils";

type Options = {
  kind: FormDraftKind;
  enabled?: boolean;
  onDraftId: (id: string) => void;
  onStep: (step: number) => void;
};

/** Load a saved draft when `?draftId=` is present on create pages. */
export function useFormDraftRestore<
  T extends NewEventFormData = NewEventFormData,
>(
  form: UseFormReturn<T>,
  { kind, enabled = true, onDraftId, onStep }: Options
) {
  const searchParams = useSearchParams();
  const draftIdParam = searchParams.get("draftId")?.trim() ?? null;
  const [restoring, setRestoring] = useState(Boolean(draftIdParam));
  const restoredRef = useRef(false);

  useEffect(() => {
    if (!enabled || !draftIdParam || restoredRef.current) {
      setRestoring(false);
      return;
    }

    restoredRef.current = true;
    void getFormDraftAction(draftIdParam).then(res => {
      setRestoring(false);
      if (!res.success || !res.data) {
        toast.error(res.message ?? "Could not load draft");
        return;
      }
      const draft = res.data;
      if (draft.kind !== kind) {
        toast.error("This draft belongs to a different create flow");
        return;
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
    });
  }, [draftIdParam, enabled, form, kind, onDraftId, onStep]);

  return { restoring, draftIdFromUrl: draftIdParam };
}
