/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

// Third-party imports
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { persistAuthSession } from "@/lib/session-client";
import { useMediaQuery } from "react-responsive";
import { BeatLoader } from "react-spinners";
import {
  ExpressCheckoutElement,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";

// Local imports
import { markPaymentCompleted, setSelectedTips } from "@/features/tip-slice";
import { createVisitorTipperAction } from "@/actions/visitors";
import { getDeviceKey } from "@/lib/getAuthToken";
import { setCredentials } from "@/features/auth-slice";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DRAWER_NESTED_Z_INDEX, DRAWER_Z_INDEX } from "@/lib/drawer-z-index";

import { startPreview, stopPreview } from "@/lib/previewController";
import { createAnimationFromStyle } from "@/lib/factory-to-style";
import { computeTipRewardEligibility } from "@/lib/tip-reward-eligibility";
import { TipRewardMeter } from "@/components/events/tip-reward-meter";
import {
  savePaymentOrigin,
  writePendingTipBroadcast,
  clearPendingTipBroadcast,
  readTipResumeCtx,
  clearTipResumeCtx,
  getStripeReturnUrl,
  type TipResumeWalletLineV1,
} from "@/lib/payment-origin";
import { setPaymentPendingReturn } from "@/lib/tv-payment-snapshot";
import { schedulePwaPromptAfterPaymentAnimation } from "@/lib/pwa-install-trigger";
import type { PaymentSurface } from "@/lib/analytics-types";
import {
  getAnalyticsSessionId,
  getDeviceCategory,
} from "@/lib/analytics-session";
import { trackTvCommentSubmit } from "@/lib/tvAnalytics";
import {
  TipperWalletChip,
  TipperWalletDialog,
} from "@/components/payments/tipper-wallet-entry";
import { useTipperWalletStatus } from "@/hooks/use-tipper-wallet-status";
import {
  ensureSingleTextInCart,
  buildTipSectionPreviewCharacters,
  isTextCharacterId,
  clearTextTipDraftStorage,
  resolveCommentPreviewCharacter,
  textCharacterIdFromEnv,
  tipCartNameForCharacter,
} from "@/lib/tip-text-selection";
import { runTextTipPreviewThenOpenDraftModal } from "@/lib/text-tip-draft-flow";
import { presentTextTipDraftModal } from "@/components/events/text-tip-draft-modal-layer";
import { useFeatureCardTipContext } from "@/components/video-feature/feature-card-tip-context";
import type { TipQuoteContext } from "@/hooks/use-tip-presentation";
import {
  buildTipQuoteRequestBody,
  postTipQuote,
} from "@/lib/build-tip-quote-request";
import { TipPremiumIndicator } from "@/components/events/tip-premium-indicator";

interface Character {
  id: string;
  name: string;
  iconUrl: string;
  price: number;
  /** "tip" | "comment" — matches server Character.type for analytics */
  type?: string;
  displayLabel?: string;
  tipKind?: "default" | "premium";
  /** Animation style key from server / character config */
  styleName?: string;
}

export const TipDrawer = ({
  open,
  onOpenChange,
  eventId,
  tippingCharacters = [],
  characterSets = [],
  performerId = null,
  paymentSurface = "unknown",
  paymentCommunityId,
  paymentChannelId,
  getPlaybackOffsetSec,
  getWatchDurationBeforePayMs,
  stackAboveImmersive,
  walletDialogOpen: walletDialogOpenControlled,
  onWalletDialogOpenChange,
  openWalletModalNonce = 0,
  onSnapshotPaymentRedirect,
  videoFeatureCardId,
  textTipUnitPrice,
  payLabel,
  tipQuoteContext,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  eventId?: string;
  tippingCharacters?: Character[];
  characterSets?: any[];
  performerId?: string | null;
  paymentSurface?: PaymentSurface;
  /** When tipping in a community context (explore community tab, community TV, etc.) */
  paymentCommunityId?: string;
  paymentChannelId?: string | null;
  getPlaybackOffsetSec?: () => number | null;
  getWatchDurationBeforePayMs?: () => number | null;
  /** Raise overlay/content above mobile full-view shell (z-280). */
  stackAboveImmersive?: boolean;
  /** Controlled wallet modal (e.g. pay-button stamp opens wallet without drawer). */
  walletDialogOpen?: boolean;
  onWalletDialogOpenChange?: (v: boolean) => void;
  /** Increment to open the wallet modal (e.g. after top-up resume). */
  openWalletModalNonce?: number;
  /** TV: refresh persisted playback snapshot before Stripe wallet top-up redirect. */
  onSnapshotPaymentRedirect?: () => void;
  /** When tipping from a promoted feature card; falls back to FeatureCardTipContext. */
  videoFeatureCardId?: string | null;
  textTipUnitPrice?: number;
  payLabel?: string;
  tipQuoteContext?: TipQuoteContext | null;
}) => {
  const textUnit = textTipUnitPrice ?? 5;
  const payCta = payLabel?.trim() || "Pay";
  const [textTipActive, setTextTipActive] = useState(false);
  const [textTipValue, setTextTipValue] = useState("");
  const [draftSyncEpoch, setDraftSyncEpoch] = useState(0);
  const cancelTextPreviewRef = useRef<(() => void) | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [isLoadingPaymentOptions, setIsLoadingPaymentOptions] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  const [walletDebitSnapshot, setWalletDebitSnapshot] = useState<{
    lines: TipResumeWalletLineV1[];
    total: number;
  } | null>(null);

  const filteredCharacterSets = useMemo(() => {
    const filtered = characterSets?.filter(set => set.characters?.length > 0);

    // Sort "General" first, others keep original order
    filtered.sort((a, b) => {
      if (a.name === "General") return -1;
      if (b.name === "General") return 1;
      return 0;
    });

    return filtered.map(set => ({
      ...set,
      characters: buildTipSectionPreviewCharacters(set.characters),
    }));
  }, [characterSets]);

  const characterSetsKey = useMemo(
    () =>
      (characterSets ?? [])
        .map(
          set =>
            `${set?.id ?? ""}:${Array.isArray(set?.characters) ? set.characters.map((c: Character) => c.id).join(",") : ""}`
        )
        .join("|"),
    [characterSets]
  );

  const router = useRouter();
  const { activeVideoFeatureCardId, setActiveVideoFeatureCardId } =
    useFeatureCardTipContext();

  const vfEffectiveId = useMemo(
    () =>
      String(videoFeatureCardId ?? activeVideoFeatureCardId ?? "").trim() ||
      undefined,
    [videoFeatureCardId, activeVideoFeatureCardId]
  );

  useEffect(() => {
    if (!open) setActiveVideoFeatureCardId(null);
  }, [open, setActiveVideoFeatureCardId]);

  const user = useSelector((state: RootState) => state.auth.user);
  const userId = user?.id;
  const role = user?.role;

  const [walletDialogOpenInternal, setWalletDialogOpenInternal] =
    useState(false);
  const walletDialogOpen =
    walletDialogOpenControlled !== undefined
      ? walletDialogOpenControlled
      : walletDialogOpenInternal;
  const setWalletDialogOpen =
    onWalletDialogOpenChange ?? setWalletDialogOpenInternal;

  const walletAutoOpenNonceRef = useRef(0);
  useEffect(() => {
    if (
      !openWalletModalNonce ||
      openWalletModalNonce <= walletAutoOpenNonceRef.current
    )
      return;
    walletAutoOpenNonceRef.current = openWalletModalNonce;
    setWalletDialogOpen(true);
  }, [openWalletModalNonce, setWalletDialogOpen]);

  const { status: walletLive, refresh: refreshWallet } = useTipperWalletStatus(
    userId,
    role
  );

  const dispatch = useDispatch();
  const { paymentCompleted, selectedTips } = useSelector(
    (state: RootState) => state.tip
  );

  const tipsForTotals = useMemo(
    () => ensureSingleTextInCart(selectedTips),
    [selectedTips]
  );
  const prevPaymentCompletedRef = useRef(false);

  const [isElementReady, setIsElementReady] = useState(false);
  const [showDefaultPayButton, setShowDefaultPayButton] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const boundEventIdRef = useRef<string | undefined>(undefined);
  const prevCharacterSetsKeyRef = useRef<string | undefined>(undefined);
  const drawerShellRef = useRef<HTMLDivElement>(null);
  const appliedResumeKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (paymentCompleted && !prevPaymentCompletedRef.current) {
      const hasTextTip = textTipActive || selectedTips.includes("Comment");
      const hasCommentChar = tippingCharacters.some(
        c => selectedTips.includes(c.name) && c.type === "comment"
      );
      if ((hasTextTip || hasCommentChar) && paymentChannelId) {
        trackTvCommentSubmit(paymentChannelId);
      }
    }
    prevPaymentCompletedRef.current = paymentCompleted;
  }, [
    paymentCompleted,
    textTipActive,
    selectedTips,
    paymentChannelId,
    tippingCharacters,
  ]);

  useEffect(() => {
    if (!eventId) {
      boundEventIdRef.current = undefined;
      return;
    }

    const previous = boundEventIdRef.current;
    boundEventIdRef.current = eventId;

    if (previous === undefined) return;

    if (previous === eventId) return;

    if (isProcessing || isRedirecting) return;

    dispatch(setSelectedTips([]));
    setTextTipActive(false);
    setTextTipValue("");
    setSelectedTabIndex(0);
    setCardModalOpen(false);
    setShowDefaultPayButton(true);
    setIsLoadingPaymentOptions(true);
    setIsElementReady(false);
    setErrorMessage(undefined);
    setWalletDebitSnapshot(null);
    appliedResumeKeyRef.current = null;
    clearTipResumeCtx();
  }, [eventId, isProcessing, isRedirecting, dispatch]);

  useEffect(() => {
    const previous = prevCharacterSetsKeyRef.current;
    prevCharacterSetsKeyRef.current = characterSetsKey;
    if (previous === undefined) return;
    if (previous === characterSetsKey) return;
    setSelectedTabIndex(0);
    if (isProcessing || isRedirecting) return;
    dispatch(setSelectedTips([]));
    setTextTipActive(false);
    setTextTipValue("");
    setCardModalOpen(false);
    setShowDefaultPayButton(true);
    setWalletDebitSnapshot(null);
  }, [characterSetsKey, dispatch, isProcessing, isRedirecting]);

  useEffect(() => {
    if (!open) {
      setWalletDebitSnapshot(null);
      appliedResumeKeyRef.current = null;
      // Do not clearTipResumeCtx() here: on first paint the drawer is closed, and clearing
      // would wipe storage before useWalletTopupTipResume runs in the parent (same effect
      // flush), breaking return-from-Stripe resume + wallet auto-open.
    }
  }, [open]);

  useEffect(() => {
    if (!open || !eventId?.trim()) return;
    const ctx = readTipResumeCtx();
    if (!ctx || ctx.eventId.trim() !== eventId.trim()) return;
    const resumeKey = `${ctx.eventId}:${ctx.createdAt}`;
    setPaymentPendingReturn(false);
    if (appliedResumeKeyRef.current === resumeKey) {
      setWalletDebitSnapshot({
        lines: ctx.walletLines.map(l => ({ ...l })),
        total: ctx.walletTotal,
      });
      return;
    }
    appliedResumeKeyRef.current = resumeKey;
    dispatch(setSelectedTips(ensureSingleTextInCart([...ctx.selectedTips])));
    setTextTipActive(ctx.textTipActive);
    setTextTipValue(ctx.secondaryText ?? "");
    setWalletDebitSnapshot({
      lines: ctx.walletLines.map(l => ({ ...l })),
      total: ctx.walletTotal,
    });
  }, [open, eventId, dispatch]);

  useEffect(
    () => () => {
      cancelTextPreviewRef.current?.();
    },
    []
  );

  /** Sync text draft label state when localStorage changes (same tab + after drop). */
  useEffect(() => {
    const sync = () => {
      try {
        const v = localStorage.getItem("textTipValue") ?? "";
        setTextTipValue(v);
        const hasLs = !!v.trim();
        setTextTipActive(hasLs || tipsForTotals.includes("Comment"));
      } catch {
        setTextTipValue("");
        setTextTipActive(false);
      }
      setDraftSyncEpoch(e => e + 1);
    };
    sync();
    window.addEventListener("tip:text-draft-sync", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("tip:text-draft-sync", sync);
      window.removeEventListener("storage", sync);
    };
  }, [tipsForTotals]);

  /** Prefill text state when opening drawer if Text is in cart (preview flow used LS only). */
  useEffect(() => {
    if (!open) return;
    try {
      const fromStorage = localStorage.getItem("textTipValue") ?? "";
      if (!selectedTips.includes("Comment") || !fromStorage.trim()) return;
      setTextTipValue(prev => (prev.trim() !== "" ? prev : fromStorage));
      setTextTipActive(true);
    } catch {
      /* ignore */
    }
  }, [open, selectedTips]);

  const openTextDraftModalOnly = () => {
    cancelTextPreviewRef.current?.();
    cancelTextPreviewRef.current = null;
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
        presentTextTipDraftModal();
      },
      drawerTintRoot: drawerShellRef.current,
    });
  };

  const makeTipSelection = (characterId: string) => {
    // ─────────────────────────────
    // Text Tip — preview animation, then modal (edit skips preview).
    // ─────────────────────────────
    if (isTextCharacterId(characterId)) {
      openTextDraftModal();
      return;
    }

    const character = tippingCharacters.find(c => c.id === characterId);
    if (!character) return;

    if (!character.styleName) {
      console.error("Missing styleName for character", character);
      return;
    }

    const cartName = tipCartNameForCharacter(character);
    dispatch(
      setSelectedTips(ensureSingleTextInCart([...tipsForTotals, cartName]))
    );

    // ─────────────────────────────
    // Start Preview (auto-cancels previous)
    // ─────────────────────────────
    requestAnimationFrame(() => {
      const next = computeTipRewardEligibility(
        ensureSingleTextInCart([...tipsForTotals, cartName]),
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
          drawerTintRoot: drawerShellRef.current,
        }
      );
    });
  };

  const removeAllOfTip = (characterName: string) => {
    if (characterName === "Comment") {
      cancelTextPreviewRef.current?.();
      cancelTextPreviewRef.current = null;
      stopPreview();
      setTextTipActive(false);
      clearTextTipDraftStorage();
    }
    const updated = selectedTips.filter(name => name !== characterName);
    dispatch(setSelectedTips(updated));
  };

  const totalAmount = useMemo(() => {
    return tipsForTotals.reduce((acc, characterName) => {
      if (characterName === "Comment") {
        return acc + textUnit;
      }
      const character = tippingCharacters.find(c => c.name === characterName);
      return acc + (character?.price || 0);
    }, 0);
  }, [tipsForTotals, tippingCharacters, textUnit]);

  const rewardEligibility = useMemo(
    () =>
      computeTipRewardEligibility(tipsForTotals, tippingCharacters, textUnit),
    [tipsForTotals, tippingCharacters, textUnit]
  );

  const characters = useMemo(() => {
    const characterCounts: Record<string, number> = {};

    tipsForTotals
      .filter(name => name !== "Comment")
      .forEach(characterName => {
        characterCounts[characterName] =
          (characterCounts[characterName] || 0) + 1;
      });

    const chars = Object.entries(characterCounts).map(
      ([characterName, count]) => {
        const character = tippingCharacters.find(c => c.name === characterName);
        return {
          name: characterName,
          price: (character?.price || 0) * count,
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          characterId: character?.id || characterName,
        };
      }
    );

    const textCount = tipsForTotals.filter(name => name === "Comment").length;
    const textCharId = textCharacterIdFromEnv() ?? "";

    if (textCount > 0) {
      chars.push({
        name: "Comment",
        price: textUnit * textCount,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        characterId: textCharId || "Comment",
      });
    }

    return chars;
  }, [tipsForTotals, tippingCharacters, textUnit]);

  const walletPayLines = useMemo(
    () => walletDebitSnapshot?.lines ?? characters,
    [walletDebitSnapshot, characters]
  );
  const walletPayTotal = useMemo(
    () => walletDebitSnapshot?.total ?? totalAmount,
    [walletDebitSnapshot, totalAmount]
  );

  const ensureTipQuoteId = useCallback(async () => {
    if (!tipQuoteContext || !eventId) return undefined;
    const body = buildTipQuoteRequestBody(
      tipQuoteContext.eventId,
      tipQuoteContext.configVersion,
      tipQuoteContext.surface,
      tipsForTotals,
      tipQuoteContext.catalog,
      tipQuoteContext.textUnitPrice
    );
    if (!body) {
      throw new Error("Could not lock tip total. Refresh and try again.");
    }
    const { quoteId } = await postTipQuote(body);
    return quoteId;
  }, [tipQuoteContext, eventId, tipsForTotals]);

  useEffect(() => {
    if (walletPayTotal > 0) {
      localStorage.setItem("amount", String(walletPayTotal));
    }
  }, [walletPayTotal]);

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

  // Stripe payments
  const stripe = useStripe();
  const elements = useElements();

  const handleDefaultPayButton = async () => {
    await onConfirm();
  };

  const onConfirm = async () => {
    if (!stripe || !elements) {
      // Stripe.js hasn't loaded yet.
      return;
    }

    if (isProcessing || isRedirecting) return;

    if (
      paymentSurface !== "event_room" &&
      paymentSurface !== "community_room" &&
      !paymentChannelId?.trim()
    ) {
      setErrorMessage(
        "This tip must be tied to the video you are watching. Open the tip drawer from the playing video and try again."
      );
      return;
    }

    setIsProcessing(true);

    let finalUserId = userId;
    let finalRole = role;

    // If user is not logged in, create a visitor/tipper account
    if (!userId) {
      const visitorRes = await createVisitorTipperAction(getDeviceKey());

      if (!visitorRes || !visitorRes.visitor) {
        setErrorMessage("Unable to create visitor account");
        setIsProcessing(false);
        return;
      }

      const v = visitorRes.visitor as {
        id: string;
        fullName: string;
        email?: string;
        username: string;
      };
      const { id, fullName, email, username } = v;
      const token = visitorRes.token as string;

      if (visitorRes.visitor) {
        dispatch(
          setCredentials({
            user: {
              id,
              fullName,
              email: email ?? "",
              username,
              role: "VISITOR",
            },
            token,
          })
        );
        finalUserId = v.id;
        finalRole = "VISITOR";

        await persistAuthSession(
          token ?? "",
          {
            id,
            fullName,
            email: email ?? "",
            username,
            role: "VISITOR",
          },
          { expiresDays: 1 }
        );
      } else {
        throw new Error("Failed to create visitor account");
      }
    }

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setErrorMessage(submitError.message);
      setIsProcessing(false);
      return;
    }

    // Create a ConfirmationToken using the details collected by the Express Checkout Element
    const { error, confirmationToken } = await stripe.createConfirmationToken({
      elements,
    });

    if (error) {
      setErrorMessage(error.message);
      setIsProcessing(false);
      return;
    }

    if (!confirmationToken?.id) {
      setErrorMessage("Could not prepare payment. Try again.");
      setIsProcessing(false);
      return;
    }

    let tipQuoteId: string | undefined;
    if (
      tipQuoteContext &&
      (paymentSurface === "event_room" ||
        paymentSurface === "community_room") &&
      eventId
    ) {
      const body = buildTipQuoteRequestBody(
        tipQuoteContext.eventId,
        tipQuoteContext.configVersion,
        tipQuoteContext.surface,
        tipsForTotals,
        tipQuoteContext.catalog,
        tipQuoteContext.textUnitPrice
      );
      if (!body) {
        if (walletPayTotal > 0) {
          setErrorMessage("Could not lock tip total. Refresh the page.");
          setIsProcessing(false);
          return;
        }
      } else {
        try {
          const q = await postTipQuote(body);
          tipQuoteId = q.quoteId;
        } catch (e) {
          setErrorMessage(
            e instanceof Error ? e.message : "Could not lock tip total"
          );
          setIsProcessing(false);
          return;
        }
      }
    }

    // Send the ConfirmationToken ID to your server for additional logic and attach the ConfirmationToken
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/payments/create-payment-intent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: Number(walletPayTotal),
          eventId,
          userId: finalUserId,
          role: finalRole,
          characters: walletPayLines,
          confirmationTokenId: confirmationToken?.id,
          performerId,
          paymentSurface,
          paymentContentId: paymentChannelId ?? undefined,
          communityId: paymentCommunityId,
          playbackOffsetSec: (() => {
            const o = getPlaybackOffsetSec?.();
            return typeof o === "number" && !Number.isNaN(o)
              ? Math.max(0, Math.floor(o))
              : undefined;
          })(),
          watchDurationBeforePayMs: (() => {
            const w = getWatchDurationBeforePayMs?.();
            return typeof w === "number" && !Number.isNaN(w) && w >= 0
              ? Math.floor(w)
              : undefined;
          })(),
          secondaryText:
            (textTipActive || selectedTips.includes("Comment")) &&
            textTipValue?.trim()
              ? textTipValue.trim().slice(0, 500)
              : undefined,
          deviceCategory: getDeviceCategory(),
          clientSessionId: getAnalyticsSessionId(),
          ...(vfEffectiveId ? { videoFeatureCardId: vfEffectiveId } : {}),
          ...(tipQuoteId ? { tipQuoteId } : {}),
        }),
      }
    );

    const data = await res.json();

    if (!data?.client_secret) {
      setErrorMessage("Payment could not be initiated.");
      setIsProcessing(false);
      return;
    }

    const tipTransactionId =
      typeof data.transactionId === "string" && data.transactionId.trim()
        ? data.transactionId.trim()
        : undefined;

    const clientSecret = data.client_secret;

    setIsRedirecting(true);
    setIsProcessing(true);

    writePendingTipBroadcast({
      eventId: eventId || "",
      selectedTips: [...selectedTips],
      amount: Number(walletPayTotal),
      secondaryText:
        (textTipActive || selectedTips.includes("Comment")) &&
        textTipValue?.trim()
          ? textTipValue.trim().slice(0, 500)
          : undefined,
      ...(paymentChannelId?.trim()
        ? { eventChannelId: paymentChannelId.trim() }
        : {}),
      ...(tipTransactionId ? { transactionId: tipTransactionId } : {}),
    });

    savePaymentOrigin();

    // Confirm the PaymentIntent
    const { error: confirmError } = await stripe.confirmPayment({
      clientSecret,
      confirmParams: {
        confirmation_token: confirmationToken?.id,
        return_url: getStripeReturnUrl(),
      },
    });

    if (confirmError) {
      console.error("[TipDrawer] Stripe confirmPayment failed", confirmError);
      clearPendingTipBroadcast();
      // This point is only reached if there's an immediate error when
      // confirming the payment.
      setErrorMessage(confirmError.message);
      setIsProcessing(false);
      setIsRedirecting(false);
      return;
    } else {
      // The payment UI automatically closes with a success animation.
      // Your customer is redirected to your `return_url`.
      // router.push("/success");
      // window.location.href = `${process.env.NEXT_PUBLIC_FRONTEND_APP_URL}/success`;
      setIsRedirecting(true);
      // router.replace(`${process.env.NEXT_PUBLIC_FRONTEND_APP_URL}/success`);
    }

    if (!confirmError) {
      // updateAfterPayment(Number(totalAmount))
    }
  };

  useEffect(() => {
    router.prefetch("/success");
  }, [router]);

  const isMobile = useMediaQuery({ maxWidth: 768 });

  const canPay = walletPayTotal > 0 && !paymentCompleted;

  // Express checkout stays mounted for Stripe token flow but is never shown in the drawer UI.
  useEffect(() => {
    if (open && canPay) {
      setShowDefaultPayButton(true);
      setIsLoadingPaymentOptions(false);
    }
  }, [open, canPay]);

  useEffect(() => {
    if (isElementReady && open) {
      setIsLoadingPaymentOptions(false);
    }
  }, [isElementReady, open]);

  const options = {
    layout: {
      type: "tabs",
      defaultCollapsed: false,
      radios: false,
      maxColumns: 2,
      maxRows: isMobile ? 4 : 3,
      showOverflowMenu: true,
    },
    buttonHeight: 40,
  };

  const LoadingOverlay = () => (
    <div
      className="Z-[999999999999999] fixed inset-0 flex flex-col items-center justify-center bg-white"
      style={{ zIndex: 999999999999999 }}
    >
      <BeatLoader color="#f57d11" />
    </div>
  );

  return (
    <>
      {(isProcessing || isRedirecting) && <LoadingOverlay />}

      <Drawer
        open={open && !isRedirecting}
        onOpenChange={nextOpen => {
          if (isProcessing || isRedirecting) return;
          if (!nextOpen) {
            if (textTipActive || selectedTips.includes("Comment")) {
              cancelTextPreviewRef.current?.();
              cancelTextPreviewRef.current = null;
              stopPreview();
            }
            clearTipResumeCtx();
          }
          onOpenChange(nextOpen);
        }}
      >
        <DrawerContent
          overlayClassName={stackAboveImmersive ? "z-[10000]" : undefined}
          className={cn(
            "space-y-2 border bg-white p-6 shadow-sm",
            stackAboveImmersive && "z-[10000]"
          )}
          style={{ zIndex: stackAboveImmersive ? 10000 : 250 }}
        >
          <div
            ref={drawerShellRef}
            className="relative z-[1] flex min-h-0 flex-col gap-2 space-y-2"
          >
            <div className="flex justify-between gap-2 border p-2">
              <div className="bg-secondary/20 text-primary flex flex-col items-center justify-center rounded-md p-2 text-xs font-semibold">
                £{walletPayTotal}
              </div>

              {selectedTips.length > 0 && !paymentCompleted && (
                <div className="flex w-20 items-center overflow-visible text-[12px] leading-3 font-medium sm:text-[12px] md:w-60">
                  Pay to send
                </div>
              )}

              <div
                className={`scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent flex flex-1 items-center gap-2 overflow-x-auto overflow-y-visible rounded-md border text-sm`}
              >
                <div className="flex flex-1 flex-row-reverse gap-2">
                  <div className="scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent ml-auto flex flex-row-reverse items-center gap-1 overflow-x-auto scroll-smooth px-1 py-2 text-sm whitespace-nowrap">
                    {(tipsForTotals.includes("Comment") || textTipActive) && (
                      <span
                        key="Comment"
                        className="relative mr-1 flex items-center gap-1 rounded-full bg-black px-2 py-1 whitespace-nowrap text-white"
                      >
                        Comment
                        <button
                          type="button"
                          className="text-md ml-1 rounded-full px-1 text-xs text-white focus:outline-none"
                          onClick={() => removeAllOfTip("Comment")}
                          aria-label="Remove all Comment"
                        >
                          x
                        </button>
                      </span>
                    )}
                    {tipsForTotals.length > 0 &&
                      Array.from(new Set(tipsForTotals))
                        .filter(characterName => {
                          if (
                            characterName === "Text" ||
                            characterName === "Comment"
                          ) {
                            return false;
                          }
                          const match = tippingCharacters.find(
                            c => c.name === characterName
                          );
                          return !(match && isTextCharacterId(match.id));
                        })
                        .map(characterName => (
                          <span
                            key={characterName}
                            className="relative mr-1 flex items-center gap-1 rounded-full bg-black px-2 py-1 text-xs whitespace-nowrap text-white sm:text-sm"
                          >
                            {characterName}
                            <button
                              type="button"
                              className="text-md ml-1 rounded-full px-1 text-xs text-white focus:outline-none"
                              onClick={() => removeAllOfTip(characterName)}
                              aria-label={`Remove all ${characterName}`}
                            >
                              x
                            </button>
                          </span>
                        ))}
                    {tipsForTotals.length === 0 && !textTipActive && (
                      <span className="text-muted-foreground text-xs"></span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <TipRewardMeter eligibility={rewardEligibility} />

            <div className="flex flex-wrap items-center gap-2">
              <TipperWalletChip
                userId={userId}
                userRole={role}
                walletSnapshot={walletLive}
                onOpen={() => setWalletDialogOpen(true)}
              />
              <h6 className="text-xl font-semibold">Select tips</h6>
              {!paymentCompleted && showEditMessageLink && (
                <button
                  type="button"
                  className="text-primary text-xs font-medium underline underline-offset-2 hover:text-black"
                  onClick={() => openTextDraftModal()}
                >
                  Edit message
                </button>
              )}

              {/* Tabs buttons */}
              <div className="flex gap-2 overflow-x-auto">
                {filteredCharacterSets.map((set, index) => (
                  <button
                    key={set.id}
                    onClick={() => setSelectedTabIndex(index)}
                    className={`cursor-pointer text-xs font-medium whitespace-nowrap sm:text-sm ${
                      selectedTabIndex === index
                        ? "border-b border-black"
                        : "text-muted-foreground"
                    }`}
                  >
                    {set.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="w-full">
              {/* Selected tab panel */}
              <div className="relative w-full overflow-x-auto overflow-y-visible scroll-smooth">
                <div
                  className="flex h-24 min-w-max flex-wrap content-start gap-1 px-1"
                  style={{ rowGap: "1rem" }}
                >
                  {filteredCharacterSets[selectedTabIndex]?.characters.map(
                    (character: Character) => {
                      const characterName = isTextCharacterId(character.id)
                        ? "Comment"
                        : character.name;
                      const count = getSelectedCount(characterName);
                      const label = isTextCharacterId(character.id)
                        ? "Comment"
                        : character.displayLabel?.trim() || character.name;
                      const isPremium = character.tipKind === "premium";

                      return (
                        <div
                          key={character.id}
                          onClick={
                            !paymentCompleted
                              ? () => makeTipSelection(character.id)
                              : undefined
                          }
                          className={`relative flex size-16! cursor-pointer flex-col items-center justify-center rounded-lg border transition-all hover:bg-gray-50 ${
                            count > 0
                              ? "border-primary bg-orange-50"
                              : "border-gray-200"
                          } ${paymentCompleted ? "opacity-50" : ""}`}
                        >
                          {isPremium ? <TipPremiumIndicator /> : null}
                          {count > 0 && (
                            <div className="absolute top-0 right-0 rounded-full bg-black px-2 py-1 text-xs font-bold text-white">
                              {count}
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
                          <p className="text-muted-foreground text-xs">
                            <span className="border-primary inline-block border-b pb-px">
                              £{character.price}
                            </span>
                          </p>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {/* Loading State - Show when Stripe elements are loading */}
              {isLoadingPaymentOptions && canPay && (
                <div className="flex items-center justify-center py-4">
                  <BeatLoader
                    color="#f57d11"
                    size={8}
                  />
                  <span className="ml-2 text-sm text-gray-600">
                    Loading payment options...
                  </span>
                </div>
              )}

              {/* Default Pay Button - Shows initially when drawer opens via "Engage" */}
              {/* <div
                className={`transition-all duration-300 ${
                  showDefaultPayButton && canPay && !isLoadingPaymentOptions
                    ? "max-h-20 opacity-100"
                    : "max-h-0 overflow-hidden opacity-0"
                }`}
              >
                <Button
                  onClick={handleDefaultPayButton}
                  disabled={!canPay || isProcessing}
                  className="w-full flex-1 bg-black text-white"
                >
                  {isProcessing ? (
                    <BeatLoader
                      color="#ffffff"
                      size={8}
                    />
                  ) : (
                    `${payCta} £${walletPayTotal}`
                  )}
                </Button>
              </div> */}

              {/* Express checkout hidden while drawer is open — card/wallet CTAs stay primary */}
              {/* <div
                className="pointer-events-none fixed h-0 w-0 overflow-hidden opacity-0"
                aria-hidden
                id="stripe-wrapper"
              > */}
              {canPay && !isLoadingPaymentOptions && (
                <ExpressCheckoutElement
                  options={options}
                  onReady={() => {
                    setIsElementReady(true);
                    setIsLoadingPaymentOptions(false);
                  }}
                  onConfirm={onConfirm}
                />
              )}
              {/* </div> */}

              {/* Pay with card button - Shows when Stripe is ready */}
              {canPay && !isLoadingPaymentOptions && (
                <div className={`${DRAWER_NESTED_Z_INDEX} w-full`}>
                  <Button
                    onClick={() => {
                      setCardModalOpen(true);
                    }}
                    className="w-full bg-gray-900 text-white"
                  >
                    Pay with card
                  </Button>
                </div>
              )}
            </div>

            {errorMessage && <div>{errorMessage}</div>}
          </div>

          {/* CARD PAYMENT MODAL */}
          <Dialog
            open={cardModalOpen}
            onOpenChange={setCardModalOpen}
          >
            <DialogContent
              overlayClassName="bg-black/60"
              className="max-w-md rounded-xl bg-white p-6"
            >
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold">
                  Pay with card
                </DialogTitle>
              </DialogHeader>

              {/* Stripe Card Form */}
              <PaymentElement />

              {/* <Button
                disabled={isProcessing}
                onClick={onConfirm}
                className="w-full bg-black text-white"
                size="lg"
              >
                {isProcessing ? (
                  <BeatLoader
                    color="#fff"
                    size={8}
                  />
                ) : (
                  `${payCta} £${walletPayTotal}`
                )}
              </Button> */}
            </DialogContent>
          </Dialog>
        </DrawerContent>
      </Drawer>

      <TipperWalletDialog
        open={walletDialogOpen}
        onOpenChange={setWalletDialogOpen}
        userId={userId}
        userRole={role}
        mode="tip"
        eventId={eventId}
        totalAmount={walletPayTotal}
        characters={walletPayLines}
        selectedTips={selectedTips}
        secondaryText={textTipValue}
        paymentSurface={paymentSurface}
        paymentCommunityId={paymentCommunityId}
        paymentChannelId={paymentChannelId}
        getPlaybackOffsetSec={getPlaybackOffsetSec}
        getWatchDurationBeforePayMs={getWatchDurationBeforePayMs}
        stackAboveTipDrawer
        walletSnapshot={walletLive}
        onWalletSnapshotRefresh={refreshWallet}
        onBeforeStripeWalletRedirect={onSnapshotPaymentRedirect}
        videoFeatureCardId={vfEffectiveId}
        ensureTipQuoteId={
          tipQuoteContext &&
          (paymentSurface === "event_room" ||
            paymentSurface === "community_room")
            ? ensureTipQuoteId
            : undefined
        }
        onWalletDebitSuccess={() => {
          setIsProcessing(false);
          setIsRedirecting(false);
          setWalletDebitSnapshot(null);
          clearTipResumeCtx();
          savePaymentOrigin();
          const tipCount = Math.max(1, selectedTips.length);
          dispatch(setSelectedTips([]));
          dispatch(markPaymentCompleted(false));
          schedulePwaPromptAfterPaymentAnimation(tipCount);
          void refreshWallet();
          window.setTimeout(() => onOpenChange(false), 400);
        }}
      />
    </>
  );
};
