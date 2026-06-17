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

/** Present the shared text draft modal (mounted at app root, above Stripe/drawers). */
export function presentTextTipDraftModal() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(TEXT_TIP_DRAFT_PRESENT_EVENT));
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
  const dispatch = useDispatch();
  const selectedTips = useSelector(
    (state: RootState) => state.tip.selectedTips
  );

  useEffect(() => setMounted(true), []);

  const present = useCallback(() => {
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
  };

  if (!mounted) return null;

  return createPortal(
    <TextTipDraftModal
      open={open}
      onOpenChange={setOpen}
      value={value}
      onChange={setValue}
      onSave={save}
      stackOnTop
    />,
    document.body
  );
}
