"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  upsertFormDraftAction,
  type FormDraftKind,
} from "@/actions/form-drafts";
import type { NewEventFormData } from "@/schemas";
import {
  splitDraftPayload,
  splitModalDraftPayload,
  buildVerifyStatusPolicy,
  type DraftResumeOrigin,
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
  /** community id or event id for modal draft resume */
  modalTargetId?: string;
  resumeOrigin?: DraftResumeOrigin;
  verifyStatus?: Record<number, string | undefined>;
  modalVerifyState?: "idle" | "checking" | "verified" | "failed";
};

export type FormDraftSaveState = {
  saving: boolean;
  lastSavedAt: Date | null;
  saveError: string | null;
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
    modalTargetId,
    resumeOrigin,
    verifyStatus,
    modalVerifyState,
  }: Options
) {
  const draftIdRef = useRef<string | null>(draftId ?? null);
  const payloadRef = useRef(payload);
  payloadRef.current = payload;

  const payloadFingerprint = JSON.stringify(payload);

  const [saveState, setSaveState] = useState<FormDraftSaveState>({
    saving: false,
    lastSavedAt: null,
    saveError: null,
  });

  useEffect(() => {
    draftIdRef.current = draftId ?? draftIdRef.current;
  }, [draftId]);

  const persistDraft = useCallback(async () => {
    const currentPayload = payloadRef.current;
    const { payloadJson, policyJson: rawPolicy } =
      payloadKind === "modal"
        ? splitModalDraftPayload(
            currentPayload as import("@/components/events/add-video-form").AddVideoFormValues,
            modalVerifyState
          )
        : splitDraftPayload(
            currentPayload as NewEventFormData,
            payloadKind === "event"
              ? buildVerifyStatusPolicy(
                  (currentPayload as NewEventFormData).videoLinks ?? [],
                  verifyStatus ?? {}
                )
              : undefined
          );

    const policyJson =
      payloadKind === "modal" && modalTargetId?.trim()
        ? {
            ...rawPolicy,
            modal: {
              ...(
                rawPolicy as import("@/lib/form-draft-utils").FormDraftPolicyJson
              ).modal,
              targetId: modalTargetId.trim(),
              ...(resumeOrigin ? { origin: resumeOrigin } : {}),
            },
          }
        : rawPolicy;

    setSaveState(s => ({ ...s, saving: true }));
    try {
      const res = await upsertFormDraftAction({
        id: draftIdRef.current ?? undefined,
        kind,
        step,
        title,
        payloadJson,
        policyJson,
      });
      if (res.success && res.data && typeof res.data === "object") {
        const id = (res.data as { id?: string }).id;
        if (id && id !== draftIdRef.current) {
          draftIdRef.current = id;
          onDraftId?.(id);
        }
        setSaveState({
          saving: false,
          lastSavedAt: new Date(),
          saveError: null,
        });
      } else {
        setSaveState(s => ({
          ...s,
          saving: false,
          saveError: res.message ?? "Could not save draft",
        }));
      }
    } catch {
      setSaveState(s => ({
        ...s,
        saving: false,
        saveError: "Could not save draft",
      }));
    }
  }, [
    kind,
    step,
    title,
    onDraftId,
    payloadKind,
    modalTargetId,
    resumeOrigin,
    verifyStatus,
    modalVerifyState,
  ]);

  useEffect(() => {
    if (!enabled) return;

    const timer = window.setTimeout(() => {
      void persistDraft();
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [payloadFingerprint, enabled, persistDraft]);

  return { ...saveState, saveNow: persistDraft };
}
