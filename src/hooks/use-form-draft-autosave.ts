"use client";

import { useEffect, useRef } from "react";
import {
  upsertFormDraftAction,
  type FormDraftKind,
} from "@/actions/form-drafts";
import type { NewEventFormData } from "@/schemas";
import {
  splitDraftPayload,
  splitModalDraftPayload,
} from "@/lib/form-draft-utils";

type Options = {
  kind: FormDraftKind;
  step: number;
  title?: string;
  enabled?: boolean;
  draftId?: string | null;
  onDraftId?: (id: string) => void;
  /** event = multi-step create pages; modal = AddVideoForm flat shape */
  payloadKind?: "event" | "modal";
};

/** Debounced autosave for multi-step host create forms and modal add-video flows. */
export function useFormDraftAutosave(
  payload: unknown,
  {
    kind,
    step,
    title,
    enabled = true,
    draftId,
    onDraftId,
    payloadKind = "event",
  }: Options
) {
  const draftIdRef = useRef<string | null>(draftId ?? null);

  useEffect(() => {
    draftIdRef.current = draftId ?? draftIdRef.current;
  }, [draftId]);

  useEffect(() => {
    if (!enabled) return;

    const timer = window.setTimeout(() => {
      const { payloadJson, policyJson } =
        payloadKind === "modal"
          ? splitModalDraftPayload(
              payload as import("@/components/events/add-video-form").AddVideoFormValues
            )
          : splitDraftPayload(payload as NewEventFormData);

      void upsertFormDraftAction({
        id: draftIdRef.current ?? undefined,
        kind,
        step,
        title,
        payloadJson,
        policyJson,
      }).then(res => {
        if (res.success && res.data && typeof res.data === "object") {
          const id = (res.data as { id?: string }).id;
          if (id && id !== draftIdRef.current) {
            draftIdRef.current = id;
            onDraftId?.(id);
          }
        }
      });
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [payload, kind, step, title, enabled, onDraftId, payloadKind]);
}
