"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useDispatch, useSelector } from "react-redux";
import { TextTipDraftModal } from "@/components/events/text-tip-draft-modal";
import {
  ensureSingleTextInCart,
  notifyTextTipDraftSync,
} from "@/lib/tip-text-selection";
import { setSelectedTips } from "@/features/tip-slice";
import type { RootState } from "@/redux/store";

export const TEXT_TIP_DRAFT_PRESENT_EVENT = "tip:present-text-draft-modal";

export type PresentTextTipDraftModalOpts = {
  stackAbovePlaybackOverlay?: boolean;
};

/** Present the shared text draft modal (mounted at app root, above Stripe/drawers). */
export function presentTextTipDraftModal(opts?: PresentTextTipDraftModalOpts) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(TEXT_TIP_DRAFT_PRESENT_EVENT, {
      detail: {
        stackAbovePlaybackOverlay: Boolean(opts?.stackAbovePlaybackOverlay),
      },
    })
  );
}

/**
 * Global host for the text tip draft dialog.
 * Tip section / tip drawer live inside Stripe Elements; Radix dialogs there fail to show.
 * Comment drawer works because it sits outside Elements — this layer mirrors that.
 */
export function TextTipDraftModalLayer() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [stackAbovePlaybackOverlay, setStackAbovePlaybackOverlay] =
    useState(false);
  const dispatch = useDispatch();
  const selectedTips = useSelector(
    (state: RootState) => state.tip.selectedTips
  );

  useEffect(() => setMounted(true), []);

  const present = useCallback((event: Event) => {
    const detail =
      event instanceof CustomEvent
        ? (event.detail as PresentTextTipDraftModalOpts | undefined)
        : undefined;
    setStackAbovePlaybackOverlay(Boolean(detail?.stackAbovePlaybackOverlay));
    try {
      setValue(localStorage.getItem("textTipValue") ?? "");
    } catch {
      setValue("");
    }
    setOpen(true);
  }, []);

  useEffect(() => {
    window.addEventListener(TEXT_TIP_DRAFT_PRESENT_EVENT, present);
    return () =>
      window.removeEventListener(TEXT_TIP_DRAFT_PRESENT_EVENT, present);
  }, [present]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setStackAbovePlaybackOverlay(false);
  };

  const save = () => {
    try {
      localStorage.setItem("textTipValue", value);
    } catch {
      /* quota / private mode */
    }
    notifyTextTipDraftSync();
    dispatch(
      setSelectedTips(ensureSingleTextInCart([...selectedTips, "Comment"]))
    );
    setOpen(false);
    setStackAbovePlaybackOverlay(false);
  };

  if (!mounted) return null;

  return createPortal(
    <TextTipDraftModal
      open={open}
      onOpenChange={handleOpenChange}
      value={value}
      onChange={setValue}
      onSave={save}
      stackOnTop
      stackAbovePlaybackOverlay={stackAbovePlaybackOverlay}
    />,
    document.body
  );
}
