"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { FormDraftKind } from "@/actions/form-drafts";
import { modalDraftStorageKey } from "@/lib/form-draft-utils";

type CreateDialogResumeConfig = {
  openCreateDialog: () => void;
  setHostTab?: (tab: "event" | "owner" | "cocreator") => void;
  setTargetId?: (id: string) => void;
  setModalDraftId?: (id: string) => void;
  /** When false, ignore resume query params (page-owned dialogs). */
  enabled?: boolean;
};

/** Opens CreateDialog when resume query params are present; clears params after handling. */
export function useCreateDialogResume({
  openCreateDialog,
  setHostTab,
  setTargetId,
  setModalDraftId,
  enabled = true,
}: CreateDialogResumeConfig) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const handledRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    if (handledRef.current) return;
    const resume = searchParams.get("resumeCreateVideo")?.trim();
    if (resume !== "1") return;

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
    if (hostTab && setHostTab) setHostTab(hostTab);
    if (setTargetId) setTargetId(targetId);
    if (setModalDraftId) setModalDraftId(modalDraftId);

    if (draftKind && typeof window !== "undefined") {
      sessionStorage.setItem(
        modalDraftStorageKey(draftKind, targetId),
        modalDraftId
      );
    }

    openCreateDialog();

    const url = new URL(window.location.href);
    [
      "resumeCreateVideo",
      "modalDraftId",
      "targetId",
      "hostTab",
      "draftKind",
    ].forEach(key => url.searchParams.delete(key));
    router.replace(url.pathname + url.search, { scroll: false });
  }, [
    enabled,
    searchParams,
    router,
    openCreateDialog,
    setHostTab,
    setTargetId,
    setModalDraftId,
  ]);
}

export function buildCreateDialogResumeUrl(input: {
  pathname: string;
  modalDraftId: string;
  targetId: string;
  hostTab?: "event" | "owner" | "cocreator";
  draftKind: FormDraftKind;
}): string {
  const params = new URLSearchParams();
  params.set("resumeCreateVideo", "1");
  params.set("modalDraftId", input.modalDraftId);
  params.set("targetId", input.targetId);
  params.set("draftKind", input.draftKind);
  if (input.hostTab) params.set("hostTab", input.hostTab);
  return `${input.pathname}?${params.toString()}`;
}
