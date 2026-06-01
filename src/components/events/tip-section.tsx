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
import { computeTipRewardEligibility } from "@/lib/tip-reward-eligibility";
import { TipRewardMeter } from "@/components/events/tip-reward-meter";
import {
  Dialog,
  DialogHeader,
  DialogContent,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Textarea } from "../ui/textarea";
import type { PaymentSurface } from "@/lib/analytics-types";
import { useWalletTopupTipResume } from "@/hooks/use-wallet-topup-tip-resume";
import {
  ensureSingleTextInCart,
  isTextCharacterId,
  notifyTextTipDraftSync,
  textCharacterIdFromEnv,
  clearTextTipDraftStorage,
} from "@/lib/tip-text-selection";
import { runTextTipPreviewThenOpenDraftModal } from "@/lib/text-tip-draft-flow";
import type { TipQuoteContext } from "@/hooks/use-tip-presentation";
import { TipPremiumIndicator } from "@/components/events/tip-premium-indicator";

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
  getPlaybackOffsetSec,
  getWatchDurationBeforePayMs,
  textTipUnitPrice = 5,
  sectionCtaLabel,
  payLabel,
  tipQuoteContext,
}: Props) => {
  const sectionCta = sectionCtaLabel?.trim() || "Engage";
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

  const [textDraftModalOpen, setTextDraftModalOpen] = useState(false);
  const [textDraftInput, setTextDraftInput] = useState("");
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
    const list = [...tippingCharacters.filter(c => c.name !== "Comment")];
    const tid = textCharacterIdFromEnv();
    if (!tid) return list;
    return list.sort((a, b) => {
      const aText = isTextCharacterId(a.id);
      const bText = isTextCharacterId(b.id);
      if (aText && !bText) return -1;
      if (!aText && bText) return 1;
      return 0;
    });
  }, [tippingCharacters]);

  const cancelTextDraft = () => {
    cancelTextPreviewRef.current?.();
    cancelTextPreviewRef.current = null;
    stopPreview();
    clearTextTipDraftStorage();
    notifyTextTipDraftSync();
    dispatch(setSelectedTips([]));
    setTextDraftModalOpen(false);
    setTextDraftInput("");
  };

  const openTextDraftModal = () => {
    cancelTextPreviewRef.current?.();
    cancelTextPreviewRef.current = null;
    try {
      const draft =
        typeof window !== "undefined"
          ? (localStorage.getItem("textTipValue") ?? "")
          : "";
      setTextDraftInput(draft);
    } catch {
      setTextDraftInput("");
    }
    setTextDraftModalOpen(true);
  };

  const saveTextDraftModal = () => {
    try {
      localStorage.setItem("textTipValue", textDraftInput);
    } catch {
      /* quota / private mode */
    }
    notifyTextTipDraftSync();
    dispatch(
      setSelectedTips(ensureSingleTextInCart([...tipsForTotals, "Comment"]))
    );
    setTextDraftModalOpen(false);
  };

  const makeTipSelection = (characterId: string) => {
    // ─────────────────────────────
    // Text Tip — preview animation, then modal; max one Text in cart on save.
    // ─────────────────────────────
    if (isTextCharacterId(characterId)) {
      const character = tippingCharacters.find(c => isTextCharacterId(c.id));
      if (!character) {
        openTextDraftModal();
        return;
      }
      cancelTextPreviewRef.current?.();
      cancelTextPreviewRef.current = runTextTipPreviewThenOpenDraftModal({
        character,
        tippingCharacters,
        tipsForTotals,
        openDraftModal: openTextDraftModal,
      });
      return;
    }

    const character = tippingCharacters.find(c => c.id === characterId);
    if (!character) return;

    dispatch(setSelectedTips([...tipsForTotals, character.name]));

    if (!character.styleName) {
      console.error("Missing styleName for character", character);
      return;
    }

    // ─────────────────────────────
    // Start Preview (auto-cancels previous)
    // ─────────────────────────────
    requestAnimationFrame(() => {
      const next = computeTipRewardEligibility(
        [...tipsForTotals, character.name],
        tippingCharacters
      );
      startPreview(() => createAnimationFromStyle(character, "preview"), {
        rewardTurbo: next.rewardTurbo,
        rewardGalaxy: next.rewardGalaxy,
      });
    });
  };

  const totalAmount = useMemo(() => {
    return tipsForTotals.reduce((acc, characterName) => {
      if (characterName === "Comment") {
        return acc + textTipUnitPrice;
      }
      const character = tippingCharacters.find(c => c.name === characterName);
      return acc + (character?.price || 0);
    }, 0);
  }, [tipsForTotals, tippingCharacters, textTipUnitPrice]);

  const rewardEligibility = useMemo(
    () => computeTipRewardEligibility(tipsForTotals, tippingCharacters),
    [tipsForTotals, tippingCharacters]
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

  return (
    <div className="space-y-2 bg-white">
      {/* Payment options */}
      <div className="relative z-20 flex flex-col items-center justify-between gap-2 rounded-tl-2xl rounded-tr-2xl border p-1">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            size="lg"
            onClick={handleOpenDrawer}
            disabled={paymentCompleted || stripeLoading || isOpeningDrawer}
            className="relative -mt-1 mb-2 flex h-6 w-fit justify-center rounded-tl-2xl rounded-tr-2xl bg-transparent text-sm text-black"
          >
            <ChevronsUp className="text-primary" /> {sectionCta}{" "}
            <ChevronsUp className="text-primary" />
            <span
              style={{
                transform: "scaleX(1)",
              }}
              className="absolute right-18 -bottom-0.5 left-18 h-0.5 origin-left rounded-full"
            ></span>
          </Button>
          {!paymentCompleted && showEditMessageLink && (
            <button
              type="button"
              className="text-primary -mt-1 mb-2 text-xs font-medium underline underline-offset-2 hover:text-black"
              onClick={() => openTextDraftModal()}
            >
              Edit message
            </button>
          )}
        </div>

        <TipRewardMeter
          eligibility={rewardEligibility}
          className="w-full px-1"
        />

        <div className="scrollbar-none custom-scrollbar relative w-full overflow-x-auto">
          <div
            className="flex h-20 min-w-max flex-wrap content-start gap-1 overflow-x-auto px-1"
            style={{ rowGap: "1rem" }}
          >
            {allTips.map(character => {
              const tid = textCharacterIdFromEnv();
              const characterName =
                tid && isTextCharacterId(character.id)
                  ? "Comment"
                  : character.name;
              const count = getSelectedCount(characterName);
              const isTextCharacter = Boolean(
                tid && isTextCharacterId(character.id)
              );

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
                      ? () => {
                          if (
                            isTextCharacter &&
                            selectedTips.includes("Comment")
                          ) {
                            openTextDraftModal();
                            return;
                          }
                          makeTipSelection(character.id);
                        }
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

                  <h5 className="mt-0.5 text-center text-xs font-medium whitespace-nowrap">
                    {label.substring(0, 7)}
                  </h5>
                  <p className="text-muted-foreground absolute -bottom-5 left-1/2 -translate-x-1/2 overflow-visible rounded-full border border-black border-t-transparent border-r-transparent border-l-transparent bg-white p-0.5 text-xs">
                    £{character.price}
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
      <TipDrawer
        open={openDrawer}
        onOpenChange={setOpenDrawer}
        eventId={eventId}
        tippingCharacters={tippingCharacters}
        characterSets={characterSets}
        performerId={selectedPerformerId}
        paymentSurface={paymentSurface}
        paymentChannelId={paymentChannelId}
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

      <Dialog
        open={textDraftModalOpen}
        onOpenChange={open => {
          if (!open) cancelTextDraft();
          else setTextDraftModalOpen(true);
        }}
      >
        <DialogContent
          overlayClassName="bg-black/60"
          className="max-w-[min(100%,380px)] rounded-md bg-white p-6 sm:max-w-md"
        >
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-semibold">
              Add your message
            </DialogTitle>
            <p className="text-muted-foreground text-center text-sm">
              Draft is saved locally until you complete payment.
            </p>
          </DialogHeader>

          <Textarea
            value={textDraftInput}
            onChange={e => setTextDraftInput(e.target.value)}
            placeholder="Type your shout or comment…"
            className="min-h-[120px] resize-y"
            maxLength={500}
            autoFocus
          />

          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={cancelTextDraft}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="w-full bg-black text-white sm:w-auto"
              onClick={saveTextDraftModal}
            >
              Save draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
