/* eslint-disable @typescript-eslint/no-explicit-any */
import { ANIMATION_DURATION } from "@/lib/animationContract";
import { startPreview } from "@/lib/previewController";
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

  if (!character.styleName) {
    openDraftModal();
    return () => {};
  }

  requestAnimationFrame(() => {
    const next = computeTipRewardEligibility(
      [...tipsForTotals, "Text"],
      tippingCharacters
    );
    startPreview(
      () =>
        createAnimationFromStyle(
          {
            name: character.name,
            iconUrl: character.iconUrl,
            styleName: character.styleName || "",
          },
          "preview"
        ),
      {
        rewardTurbo: next.rewardTurbo,
        rewardGalaxy: next.rewardGalaxy,
        drawerTintRoot: drawerTintRoot ?? null,
      }
    );
  });

  const id = window.setTimeout(openDraftModal, TEXT_PREVIEW_BEFORE_MODAL_MS);
  return () => window.clearTimeout(id);
}
