/* eslint-disable @typescript-eslint/no-explicit-any */
import { ANIMATION_DURATION } from "@/lib/animationContract";
import { startPreview, stopPreview } from "@/lib/previewController";
import { createAnimationFromStyle } from "@/lib/factory-to-style";
import { computeTipRewardEligibility } from "@/lib/tip-reward-eligibility";

export const TEXT_PREVIEW_BEFORE_MODAL_MS = ANIMATION_DURATION.preview.max;

/**
 * Plays the text character preview, then opens the draft modal.
 * Returns a cancel function (clear timeout / best-effort).
 */
export function runTextTipPreviewThenOpenDraftModal(options: {
  character: {
    name: string;
    iconUrl: string;
    styleName?: string;
  };
  tippingCharacters: any[];
  tipsForTotals: string[];
  openDraftModal: () => void;
  drawerTintRoot?: HTMLElement | null;
}): () => void {
  const {
    character,
    tippingCharacters,
    tipsForTotals,
    openDraftModal,
    drawerTintRoot,
  } = options;

  const styleName = character.styleName?.trim() || "Screen Shake";
  const iconUrl = character.iconUrl?.trim();
  if (!iconUrl) {
    stopPreview();
    openDraftModal();
    return () => {};
  }

  let modalTimer: number | null = null;
  let cancelled = false;

  requestAnimationFrame(() => {
    if (cancelled) return;

    const next = computeTipRewardEligibility(
      [...tipsForTotals, "Comment"],
      tippingCharacters
    );
    startPreview(
      () =>
        createAnimationFromStyle(
          {
            name: character.name,
            iconUrl,
            styleName,
          },
          "preview"
        ),
      {
        rewardTurbo: next.rewardTurbo,
        rewardGalaxy: next.rewardGalaxy,
        drawerTintRoot: drawerTintRoot ?? null,
      }
    );

    modalTimer = window.setTimeout(() => {
      if (cancelled) return;
      modalTimer = null;
      stopPreview();
      openDraftModal();
    }, TEXT_PREVIEW_BEFORE_MODAL_MS);
  });

  return () => {
    cancelled = true;
    if (modalTimer !== null) window.clearTimeout(modalTimer);
  };
}
