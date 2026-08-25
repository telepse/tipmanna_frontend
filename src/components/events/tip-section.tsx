/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";

// Third-party imports
import { ChevronsUp, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { useStripe, useElements } from "@stripe/react-stripe-js";

// Local imports
import { TipDrawer } from "@/components/events/tip-drawer";
import { RootState } from "@/redux/store";
import { useAppRouter } from "@/components/navigation/navigation-progress-provider";
import { setSelectedTips } from "@/features/tip-slice";
import { startPreview, stopPreview } from "@/lib/previewController";
import { createAnimationFromStyle } from "@/lib/factory-to-style";
import {
  computeTipRewardEligibility,
  displayGalaxyAmountGbp,
  displayTurboStyleCount,
  GALAXY_MIN_AMOUNT_GBP,
  TURBO_MIN_DISTINCT_STYLES,
} from "@/lib/tip-reward-eligibility";
import {
  TipRewardGalaxyIcons,
  TipRewardTurboIcons,
} from "@/components/events/tip-reward-meter";
import { Dialog, DialogHeader, DialogContent, DialogTitle } from "../ui/dialog";
import { presentTextTipDraftModal } from "@/components/events/text-tip-draft-modal-layer";
import type { PaymentSurface } from "@/lib/analytics-types";
import { useWalletTopupTipResume } from "@/hooks/use-wallet-topup-tip-resume";
import {
  buildTipSectionPreviewCharacters,
  ensureSingleTextInCart,
  isTextTipCharacterRef,
  isTextTipCharacterSelection,
  resolveCommentPreviewCharacter,
  tipCartNameForCharacter,
} from "@/lib/tip-text-selection";
import { runTextTipPreviewThenOpenDraftModal } from "@/lib/text-tip-draft-flow";
import type { TipQuoteContext } from "@/hooks/use-tip-presentation";
import { TipPremiumIndicator } from "@/components/events/tip-premium-indicator";
import { TippingElementsProvider } from "../payments/tipping-elements-provider";
import { RoomCharacter } from "@/types";
import { computeTipCartTotal } from "@/lib/tip-cart-total";

interface Props {
  eventId: string;
  tippingCharacters: any[];
  characterSets: any[];
  performers?: any[];
  stackDrawerAboveImmersive?: boolean;
  /** Defaults to event_room (room / embedded tips). */
  paymentSurface?: PaymentSurface;
  /** EventChannel id for the playing clip (required for video analytics when not event_room). */
  paymentChannelId?: string | null;
  paymentCommunityId?: string;
  getPlaybackOffsetSec?: () => number | null;
  /** Milliseconds watched into the current clip before paying (player position). */
  getWatchDurationBeforePayMs?: () => number | null;
  textTipUnitPrice?: number;
  sectionCtaLabel?: string;
  payLabel?: string;
  tipQuoteContext?: TipQuoteContext | null;
}

export const TipSection = ({
  eventId,
  tippingCharacters,
  characterSets,
  performers,
  stackDrawerAboveImmersive,
  paymentSurface = "event_room",
  paymentChannelId = null,
  paymentCommunityId,
  getPlaybackOffsetSec,
  getWatchDurationBeforePayMs,
  textTipUnitPrice = 5,
  sectionCtaLabel,
  payLabel,
  tipQuoteContext,
}: Props) => {
  const sectionCta = "Engage";
  const [openDrawer, setOpenDrawer] = useState(false);
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [openWalletAfterPerformer, setOpenWalletAfterPerformer] =
    useState(false);
  const [openPerformerModal, setOpenPerformerModal] = useState(false);
  const [selectedPerformerId, setSelectedPerformerId] = useState<string | null>(
    null
  );
  const { paymentCompleted } = useSelector((state: RootState) => state.tip);
  const { selectedTips } = useSelector((state: RootState) => state.tip);

  const tipsForTotals = useMemo(
    () => ensureSingleTextInCart(selectedTips),
    [selectedTips]
  );

  const [draftSyncEpoch, setDraftSyncEpoch] = useState(0);
  const cancelTextPreviewRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const bump = () => setDraftSyncEpoch(e => e + 1);
    window.addEventListener("tip:text-draft-sync", bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener("tip:text-draft-sync", bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

  useEffect(
    () => () => {
      cancelTextPreviewRef.current?.();
    },
    []
  );

  const dispatch = useDispatch();

  const { openWalletModalNonce } = useWalletTopupTipResume(
    eventId,
    setOpenDrawer
  );

  const allTips = useMemo(() => {
    const ordered = buildTipSectionPreviewCharacters(tippingCharacters);
    if (ordered.length <= 1) return ordered;

    const [pinnedComment, ...rest] = ordered;
    const shuffled = [...rest];
    // for (let i = shuffled.length - 1; i > 0; i--) {
    //   const j = Math.floor(Math.random() * (i + 1));
    //   [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    // }
    shuffled.sort(() => Math.random() - 0.5);
    return [pinnedComment, ...shuffled];
  }, [tippingCharacters]);

  const openTextDraftModalOnly = () => {
    cancelTextPreviewRef.current?.();
    cancelTextPreviewRef.current = null;
    stopPreview();
    presentTextTipDraftModal();
  };

  const openTextDraft = (character: string, context: string) => {
    stopPreview();

    presentTextTipDraftModal();
  };

  const openTextDraftModal = () => {
    let existingDraft = "";
    try {
      existingDraft = (localStorage.getItem("textTipValue") ?? "").trim();
    } catch {
      /* ignore */
    }
    if (existingDraft || tipsForTotals.includes("Comment")) {
      openTextDraftModalOnly();
      return;
    }

    const character = resolveCommentPreviewCharacter(tippingCharacters);
    if (!character) {
      openTextDraftModalOnly();
      return;
    }

    cancelTextPreviewRef.current?.();
    cancelTextPreviewRef.current = runTextTipPreviewThenOpenDraftModal({
      character,
      tippingCharacters,
      tipsForTotals,
      openDraftModal: () => {
        cancelTextPreviewRef.current = null;
        stopPreview();
        presentTextTipDraftModal(); // or unified handler
      },
    });
  };

  const makeTipSelection = (characterId: string) => {
    // ─────────────────────────────
    // Text Tip — preview animation, then modal; max one Text in cart on save.
    // ─────────────────────────────
    if (isTextTipCharacterSelection(characterId, tippingCharacters)) {
      stopPreview();
      openTextDraftModal(); // ALWAYS immediate
      return;
    }

    const character = tippingCharacters.find(c => c.id === characterId);
    if (!character) return;

    const cartName = tipCartNameForCharacter(character);
    dispatch(
      setSelectedTips(ensureSingleTextInCart([...tipsForTotals, cartName]))
    );

    if (!character.styleName) {
      console.error("Missing styleName for character", character);
      return;
    }

    // ─────────────────────────────
    // Start Preview (auto-cancels previous)
    // ─────────────────────────────
    requestAnimationFrame(() => {
      const next = computeTipRewardEligibility(
        ensureSingleTextInCart([...tipsForTotals, cartName]),
        tippingCharacters
      );
      startPreview(() => createAnimationFromStyle(character, "preview"), {
        rewardTurbo: next.rewardTurbo,
        rewardGalaxy: next.rewardGalaxy,
      });
    });
  };

  const totalAmount = useMemo(
    () =>
      computeTipCartTotal(tipsForTotals, tippingCharacters, textTipUnitPrice),
    [tipsForTotals, tippingCharacters, textTipUnitPrice]
  );

  const rewardEligibility = useMemo(
    () =>
      computeTipRewardEligibility(
        tipsForTotals,
        tippingCharacters,
        textTipUnitPrice
      ),
    [tipsForTotals, tippingCharacters, textTipUnitPrice]
  );

  useEffect(() => {
    localStorage.setItem("amount", totalAmount.toString());
  }, [totalAmount]);

  const getSelectedCount = (characterName: string) => {
    return tipsForTotals.filter(name => name === characterName).length;
  };

  const showEditMessageLink = useMemo(() => {
    void draftSyncEpoch;
    if (tipsForTotals.includes("Comment")) return true;
    if (typeof window === "undefined") return false;
    try {
      return !!localStorage.getItem("textTipValue")?.trim();
    } catch {
      return false;
    }
  }, [tipsForTotals, draftSyncEpoch]);

  const { prefetch } = useAppRouter();

  useEffect(() => {
    void prefetch("/success");
  }, [prefetch]);

  const stripe = useStripe();
  const elements = useElements();
  const [stripeLoading, setStripeLoading] = useState(true);
  const [isOpeningDrawer, setIsOpeningDrawer] = useState(false);

  useEffect(() => {
    // Wait one tick so the UI renders before checking stripe
    const t = setTimeout(() => {
      if (stripe && elements) {
        setStripeLoading(false);
      }
    }, 0);

    return () => clearTimeout(t);
  }, [stripe, elements]);

  const handleOpenDrawer = () => {
    if (stripeLoading) {
      toast.error("Payment system is still loading...");
      return;
    }

    if (totalAmount <= 0) {
      toast.error("Please select at least one tip item");
      return;
    }

    // NEW LOGIC: Check if performers exist. If they do, trigger modal first.
    if (performers && performers.length > 0) {
      setOpenPerformerModal(true);
      return; // Stop here and let the modal handle the rest
    }

    // Proceed as normal if no performers exist
    proceedToDrawer();

    // // NEW: Set loading state and wait for Stripe to be ready
    // setIsOpeningDrawer(true);

    // // Wait for Stripe to be fully ready
    // if (!stripe || !elements) {
    //   toast.error("Payment system not ready yet");
    //   setIsOpeningDrawer(false);
    //   return;
    // }

    // // Small delay to ensure smooth UX
    // await new Promise(resolve => setTimeout(resolve, 100));

    // // Now open the drawer
    // setOpenDrawer(true);
    // setIsOpeningDrawer(false);
  };

  // Separated this out so both handleOpenDrawer and the modal can use it
  const proceedToDrawer = () => {
    setIsOpeningDrawer(true);
    try {
      if (!stripe || !elements) {
        toast.error("Payment system not ready yet");
        return;
      }
      setOpenDrawer(true);
    } finally {
      setIsOpeningDrawer(false);
    }
  };

  const { distinctStyleCount, totalGbp } = rewardEligibility;
  const turboDisplayCount = displayTurboStyleCount(distinctStyleCount);
  const galaxyDisplayAmount = displayGalaxyAmountGbp(totalGbp);

  return (
    <div className="space-y-2">
      {/* Payment options */}
      <div className="relative z-20 grid items-center justify-between gap-2 rounded-tl-2xl rounded-tr-2xl border p-1">
        <div className="grid grid-cols-12 items-center justify-center gap-4">
          {/* Turbo Reward */}
          <div className="col-span-3 flex flex-row items-center lg:col-span-5 lg:flex-row lg:gap-2">
            <div className="flex justify-between text-[10px] sm:text-[11px]">
              <span className="whitespace-nowrap">
                Turbo ({turboDisplayCount}/{TURBO_MIN_DISTINCT_STYLES}{" "}
                <span className="hidden lg:inline-block">styles</span>)
              </span>
            </div>

            <TipRewardTurboIcons eligibility={rewardEligibility} />
          </div>

          {/* Engage button */}
          <Button
            size="lg"
            onClick={handleOpenDrawer}
            disabled={paymentCompleted || stripeLoading || isOpeningDrawer}
            className="relative col-span-6 mb-2 ml-4 flex h-6 w-fit items-center justify-center rounded-tl-2xl rounded-tr-2xl bg-transparent text-sm text-black lg:col-span-2"
          >
            <ChevronsUp className="text-primary -mr-2" /> {sectionCta}{" "}
            <ChevronsUp className="text-primary -ml-2" />
            {/* <span
              style={{
                transform: "scaleX(1)",
              }}
              className="absolute  -bottom-0.5 left-24 h-0.5 origin-left rounded-full"
            ></span> */}
          </Button>
          {/* {!paymentCompleted && showEditMessageLink && (
            <button
              type="button"
              className="text-primary -mt-1 mb-2 text-xs font-medium underline underline-offset-2 hover:text-black"
              onClick={() => openTextDraftModal()}
            >
              Edit message
            </button>
          )} */}

          {/* Reward galaxy */}
          <div className="col-span-3 flex flex-row items-center justify-end gap-1 lg:col-span-5 lg:flex-row lg:gap-2">
            <TipRewardGalaxyIcons eligibility={rewardEligibility} />

            <div className="flex justify-between text-[10px] sm:text-[11px]">
              <span className="whitespace-nowrap">
                Galaxy (£{galaxyDisplayAmount.toFixed(0)}/£
                {GALAXY_MIN_AMOUNT_GBP})
              </span>
            </div>
          </div>
        </div>

        <div className="scrollbar-none custom-scrollbar relative w-full overflow-x-auto">
          <div
            className="flex h-20 min-w-max flex-wrap content-start gap-1 overflow-x-auto px-1"
            style={{ rowGap: "1rem" }}
          >
            {allTips.slice(0, 13).map(character => {
              const characterName = tipCartNameForCharacter(character);
              const count = getSelectedCount(characterName);
              const isTextCharacter = isTextTipCharacterRef(character);

              const label = isTextCharacter
                ? "Comment"
                : typeof (character as { displayLabel?: string })
                      .displayLabel === "string" &&
                    (character as { displayLabel?: string }).displayLabel
                  ? (character as { displayLabel: string }).displayLabel
                  : character.name;
              const isPremium =
                (character as { tipKind?: string }).tipKind === "premium";

              return (
                <div
                  key={character.id}
                  onClick={
                    !paymentCompleted
                      ? () => makeTipSelection(character.id)
                      : undefined
                  }
                  className={`hide__scrollbar relative flex size-16! w-full cursor-pointer flex-col items-center justify-center rounded-lg border transition-all hover:bg-gray-50 ${
                    count > 0
                      ? "border-orange-500 bg-orange-50"
                      : "border-gray-200"
                  } ${paymentCompleted ? "opacity-50" : ""}`}
                >
                  {isPremium ? <TipPremiumIndicator /> : null}
                  {count > 0 && (
                    <div className="bg-gray absolute top-0 right-0 rounded-full px-2 py-1 text-xs font-bold text-black">
                      {isTextCharacter ? 1 : count}
                    </div>
                  )}

                  <Image
                    src={character.iconUrl}
                    alt={character.name}
                    width={60}
                    height={60}
                    className="size-12 object-contain"
                  />

                  <h5 className="mt-0.5 text-center text-[8px] font-medium whitespace-nowrap sm:text-xs">
                    {label.substring(0, 7)}
                  </h5>
                  <p className="text-muted-foreground absolute -bottom-4 left-1/2 -translate-x-1/2 overflow-visible rounded-full bg-white text-[10px] sm:text-xs">
                    <span className="relative inline-block">
                      £{character.price}
                      <span
                        aria-hidden
                        className="bg-primary absolute right-0 bottom-0 left-0 h-px"
                      />
                    </span>
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <div className="relative w-full flex-1">
          <Button
            disabled={
              paymentCompleted ||
              stripeLoading ||
              totalAmount <= 0 ||
              isOpeningDrawer // NEW: Add isOpeningDrawer to disabled conditions
            }
            className={`h-6 w-full bg-black pr-10 text-white ${totalAmount > 0 ? "" : "opacity-50"}`}
            onClick={handleOpenDrawer}
          >
            {isOpeningDrawer
              ? "Loading..."
              : stripeLoading
                ? "Loading..."
                : `£${totalAmount}`}{" "}
          </Button>
          <button
            type="button"
            className="absolute top-1/2 right-1.5 z-10 -translate-y-1/2 rounded-full bg-white/95 p-1.5 shadow-sm ring-1 ring-black/10 transition hover:bg-white"
            aria-label="Pay with Tipper Wallet"
            disabled={paymentCompleted || totalAmount <= 0 || isOpeningDrawer}
            onClick={e => {
              e.stopPropagation();
              if (totalAmount <= 0) {
                toast.error("Please select at least one tip item");
                return;
              }
              if (performers && performers.length > 0) {
                setOpenWalletAfterPerformer(true);
                setOpenPerformerModal(true);
                return;
              }
              setWalletDialogOpen(true);
            }}
          >
            <Wallet
              className="text-primary size-4"
              aria-hidden
            />
          </button>
        </div>
      </div>

      {/* Tip drawer */}
      <TippingElementsProvider
        tippingCharacters={tippingCharacters as RoomCharacter[]}
        enabled
        textTipUnitPrice={textTipUnitPrice}
      >
        <TipDrawer
          open={openDrawer}
          onOpenChange={setOpenDrawer}
          eventId={eventId}
          tippingCharacters={tippingCharacters}
          characterSets={characterSets}
          performerId={selectedPerformerId}
          paymentSurface={paymentSurface}
          paymentChannelId={paymentChannelId}
          paymentCommunityId={paymentCommunityId}
          getPlaybackOffsetSec={getPlaybackOffsetSec}
          getWatchDurationBeforePayMs={getWatchDurationBeforePayMs}
          stackAboveImmersive={stackDrawerAboveImmersive}
          walletDialogOpen={walletDialogOpen}
          onWalletDialogOpenChange={setWalletDialogOpen}
          openWalletModalNonce={openWalletModalNonce}
          textTipUnitPrice={textTipUnitPrice}
          payLabel={payLabel}
          tipQuoteContext={tipQuoteContext}
        />
      </TippingElementsProvider>

      {/* 👈 ADDED: Performer Selection Modal */}
      <Dialog
        open={openPerformerModal}
        onOpenChange={setOpenPerformerModal}
      >
        <DialogContent className="max-w-[320px] rounded-md bg-white p-6 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-semibold">
              Tag a performer to your tip
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 overflow-y-auto">
            {performers &&
              performers.map(performer => (
                <div
                  key={performer.id}
                  onClick={() => setSelectedPerformerId(performer.id)}
                  className={`flex cursor-pointer items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition-all ${
                    selectedPerformerId === performer.id
                      ? "border-orange-500 bg-orange-50"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  @{performer.name.toLowerCase()}
                </div>
              ))}
          </div>

          <Button
            className="w-full bg-black text-white"
            onClick={() => {
              setOpenPerformerModal(false);
              if (openWalletAfterPerformer) {
                setOpenWalletAfterPerformer(false);
                setWalletDialogOpen(true);
              } else {
                proceedToDrawer();
              }
            }}
          >
            Continue
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};
