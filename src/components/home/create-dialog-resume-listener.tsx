"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import type { FormDraftKind } from "@/actions/form-drafts";
import { modalDraftStorageKey } from "@/lib/form-draft-utils";

export const CREATE_DIALOG_RESUME_QUERY_KEYS = [
  "resumeCreateVideo",
  "modalDraftId",
  "targetId",
  "hostTab",
  "draftKind",
] as const;

export type CreateDialogResumeSeed = {
  hostTab?: "event" | "owner" | "cocreator";
  targetId: string;
  modalDraftId: string;
};

type Props = {
  onResume: (seed: CreateDialogResumeSeed) => void;
};

/** Host-only: opens chrome CreateDialog when resume query params are present. */
export function CreateDialogResumeListener({ onResume }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const handledRef = useRef(false);

  useEffect(() => {
    const resume = searchParams.get("resumeCreateVideo")?.trim();
    if (resume !== "1") {
      handledRef.current = false;
      return;
    }
    if (handledRef.current) return;

    const modalDraftId = searchParams.get("modalDraftId")?.trim();
    const targetId = searchParams.get("targetId")?.trim();
    const hostTab = searchParams.get("hostTab")?.trim() as
      | "event"
      | "owner"
      | "cocreator"
      | undefined;
    const draftKind = searchParams.get("draftKind")?.trim() as
      | FormDraftKind
      | undefined;

    if (!modalDraftId || !targetId) return;

    handledRef.current = true;

    if (draftKind && typeof window !== "undefined") {
      sessionStorage.setItem(
        modalDraftStorageKey(draftKind, targetId),
        modalDraftId
      );
    }

    onResume({
      hostTab,
      targetId,
      modalDraftId,
    });

    const url = new URL(window.location.href);
    CREATE_DIALOG_RESUME_QUERY_KEYS.forEach(key =>
      url.searchParams.delete(key)
    );
    router.replace(url.pathname + url.search, { scroll: false });
  }, [searchParams, router, onResume]);

  return null;
}
