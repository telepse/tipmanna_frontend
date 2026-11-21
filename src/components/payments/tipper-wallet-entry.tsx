"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Star, Wallet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DRAWER_NESTED_Z_INDEX,
  DRAWER_Z_INDEX,
  PLAYBACK_OVERLAY_NESTED_MODAL_OVERLAY_Z_INDEX,
  PLAYBACK_OVERLAY_NESTED_MODAL_Z,
  PLAYBACK_OVERLAY_NESTED_MODAL_Z_INDEX,
} from "@/lib/drawer-z-index";
import {
  createWalletTopupIntentRequest,
  debitWalletRequest,
  WalletDebitRequestError,
  setWalletPinRequest,
  type WalletStatusResponse,
} from "@/lib/wallet-client";
import {
  clearWalletDebitPendingIdempotency,
  planWalletDebitIdempotencyKey,
  rememberWalletDebitPendingTipQuoteId,
  resolveWalletDebitPendingTipQuoteId,
  walletDebitFailureDisposition,
  type WalletDebitAttemptIdentity,
} from "@/lib/wallet-debit-pending-idempotency";
import {
  Elements,
  ExpressCheckoutElement,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import {
  clearTipResumeCtx,
  readExploreFeedTabFromLocation,
  savePaymentOrigin,
  writeTipResumeCtx,
  writeWalletTopupReturnIntent,
  getStripeReturnUrl,
} from "@/lib/payment-origin";
import type { PaymentSurface } from "@/lib/analytics-types";
import {
  getAnalyticsSessionId,
  getDeviceCategory,
} from "@/lib/analytics-session";
import { getStripeBrowserPromise } from "@/lib/stripe-browser";
import {
  WALLET_DEBIT_IN_MODAL,
  WALLET_MIN_TOPUP_GBP,
  WALLET_STANDALONE_TOPUP,
} from "@/constants/wallet";

function isWalletRole(role: string | undefined): boolean {
  return role === "TIPPER";
}

export type TipperWalletDialogMode = "tip" | "topup";

type CharacterLine = {
  name: string;
  time: string;
  price: number;
  characterId: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | undefined;
  userRole: string | undefined;
  mode?: TipperWalletDialogMode;
  eventId: string | undefined;
  totalAmount: number;
  characters: CharacterLine[];
  selectedTips: string[];
  secondaryText?: string;
  paymentSurface: PaymentSurface;
  paymentCommunityId?: string;
  paymentChannelId: string | null | undefined;
  getPlaybackOffsetSec?: () => number | null;
  getWatchDurationBeforePayMs?: () => number | null;
  /** When opened from tip drawer, stack above drawer overlay. */
  stackAboveTipDrawer?: boolean;
  /** @deprecated use stackAboveTipDrawer */
  stackAboveImmersive?: boolean;
  /** Stack above ContentPlaybackOverlay nested tip drawer. */
  stackAbovePlaybackOverlay?: boolean;
  /** Live snapshot from `useTipperWalletStatus` (or null). */
  walletSnapshot: WalletStatusResponse | null;
  onWalletSnapshotRefresh: () => void | Promise<void>;
  onWalletDebitSuccess: () => void;
  /** e.g. TV: freeze playback offset before Stripe redirect */
  onBeforeStripeWalletRedirect?: () => void;
  /** When set (event room + tip customization), wallet debit must match server quote. */
  ensureTipQuoteId?: () => Promise<string | undefined>;
  videoFeatureCardId?: string;
  performerId?: string | null;
  projectId?: string | null;
};

const expressCheckoutLayout = {
  layout: {
    type: "tabs" as const,
    defaultCollapsed: false,
    radios: false,
    maxColumns: 2,
    maxRows: 3,
    showOverflowMenu: true,
  },
  buttonHeight: 40,
};

function WalletTopupExpressInner({
  onConfirmError,
  onBeforeStripeWalletRedirect,
}: {
  onConfirmError: (message: string) => void;
  onBeforeStripeWalletRedirect?: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();

  const handleConfirm = async () => {
    if (!stripe || !elements) return;
    onBeforeStripeWalletRedirect?.();
    savePaymentOrigin();
    const { error: submitError } = await elements.submit();
    if (submitError) {
      onConfirmError(submitError.message ?? "Could not submit payment");
      return;
    }
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: getStripeReturnUrl(),
      },
    });
    if (error) {
      console.error("[TipperWalletEntry] confirmPayment failed", error);
      onConfirmError(error.message ?? "Top-up failed");
    }
  };

  return (
    <ExpressCheckoutElement
      options={expressCheckoutLayout}
      onConfirm={handleConfirm}
    />
  );
}

function WalletTopupCardInner({
  onConfirmError,
  onBeforeStripeWalletRedirect,
}: {
  onConfirmError: (message: string) => void;
  onBeforeStripeWalletRedirect?: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();

  const handlePay = async () => {
    if (!stripe || !elements) return;
    onBeforeStripeWalletRedirect?.();
    savePaymentOrigin();
    const { error: submitError } = await elements.submit();
    if (submitError) {
      onConfirmError(submitError.message ?? "Could not submit payment");
      return;
    }
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: getStripeReturnUrl(),
      },
    });
    if (error) {
      console.error("[TipperWalletEntry] confirmPayment (card) failed", error);
      onConfirmError(error.message ?? "Top-up failed");
    }
  };

  return (
    <div className="space-y-2">
      <PaymentElement />
      <Button
        type="button"
        className="w-full bg-gray-900 text-white"
        onClick={() => void handlePay()}
      >
        Pay with card
      </Button>
    </div>
  );
}

function WalletTopupStripeTree({
  clientSecret,
  onConfirmError,
  onBeforeStripeWalletRedirect,
}: {
  clientSecret: string;
  onConfirmError: (message: string) => void;
  onBeforeStripeWalletRedirect?: () => void;
}) {
  const [stripePromise, setStripePromise] = useState<ReturnType<
    typeof getStripeBrowserPromise
  > | null>(null);

  useEffect(() => {
    if (!clientSecret) {
      setStripePromise(null);
      return;
    }
    let cancelled = false;
    void getStripeBrowserPromise().then(p => {
      if (!cancelled) setStripePromise(Promise.resolve(p));
    });
    return () => {
      cancelled = true;
    };
  }, [clientSecret]);
  const options = useMemo(
    () => ({
      clientSecret,
      appearance: {
        variables: {
          colorPrimary: "#f57d11",
        },
      },
    }),
    [clientSecret]
  );

  if (!stripePromise) {
    return null;
  }

  return (
    <Elements
      stripe={stripePromise}
      options={options}
      key={clientSecret}
    >
      <p className="text-muted-foreground text-xs">
        Apple Pay, Google Pay, or card (where available):
      </p>
      <WalletTopupExpressInner
        onConfirmError={onConfirmError}
        onBeforeStripeWalletRedirect={onBeforeStripeWalletRedirect}
      />
      <div className="border-t pt-3">
        <WalletTopupCardInner
          onConfirmError={onConfirmError}
          onBeforeStripeWalletRedirect={onBeforeStripeWalletRedirect}
        />
      </div>
    </Elements>
  );
}

export function TipperWalletChip({
  userId,
  userRole,
  onOpen,
  walletSnapshot,
}: {
  userId: string | undefined;
  userRole: string | undefined;
  onOpen: () => void;
  walletSnapshot: WalletStatusResponse | null;
}) {
  const disabled =
    isWalletRole(userRole) &&
    walletSnapshot?.exists &&
    walletSnapshot.status === "DISABLED";

  const showBalance =
    isWalletRole(userRole) &&
    walletSnapshot?.exists &&
    walletSnapshot.status === "ACTIVE";

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!userId || disabled}
      title={
        disabled ? "Wallet disabled — contact hello@tipmanna.tv" : undefined
      }
      className={cn(
        "flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-sm font-medium text-orange-900 shadow-sm transition hover:bg-orange-100 focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:outline-none",
        disabled && "cursor-not-allowed opacity-60"
      )}
      aria-label="Tipper Wallet payment option"
    >
      <Wallet
        className="size-4 shrink-0 text-orange-600"
        aria-hidden
      />
      {disabled ? (
        <span className="text-xs text-orange-800/90">Wallet unavailable</span>
      ) : showBalance ? (
        <span>£{Number(walletSnapshot!.balance).toFixed(2)}</span>
      ) : (
        <span className="flex items-center gap-0.5">
          <Star
            className="size-3.5 text-amber-500"
            aria-hidden
          />
          <span className="text-xs text-orange-800/90">Wallet</span>
        </span>
      )}
    </button>
  );
}

export function TipperWalletDialog({
  open,
  onOpenChange,
  userId,
  userRole,
  mode = "tip",
  eventId,
  totalAmount,
  characters,
  selectedTips,
  secondaryText = "",
  paymentSurface,
  paymentCommunityId,
  paymentChannelId,
  getPlaybackOffsetSec,
  getWatchDurationBeforePayMs,
  stackAboveTipDrawer,
  stackAboveImmersive,
  stackAbovePlaybackOverlay,
  walletSnapshot: status,
  onWalletSnapshotRefresh: refresh,
  onWalletDebitSuccess,
  onBeforeStripeWalletRedirect,
  ensureTipQuoteId,
  videoFeatureCardId,
  performerId,
  projectId,
}: Props) {
  const [pin, setPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showCardTopup, setShowCardTopup] = useState(false);
  const [topupClientSecret, setTopupClientSecret] = useState<string | null>(
    null
  );
  const [topupLoading, setTopupLoading] = useState(false);
  const [topupAmountInput, setTopupAmountInput] = useState("");
  const [debitSuccess, setDebitSuccess] = useState(false);
  const [forgotPinMode, setForgotPinMode] = useState(false);
  const [pinResetSent, setPinResetSent] = useState(false);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  useEffect(() => {
    if (!open) {
      setShowCardTopup(false);
      setTopupClientSecret(null);
      setTopupLoading(false);
      setDebitSuccess(false);
      setForgotPinMode(false);
      setPinResetSent(false);
      setErr(null);
    }
  }, [open]);

  useEffect(() => {
    if (
      open &&
      mode === "tip" &&
      status?.exists &&
      status.status === "ACTIVE"
    ) {
      const shortfall = Math.max(0, totalAmount - Number(status.balance ?? 0));
      const pref =
        shortfall > 0
          ? Math.max(WALLET_MIN_TOPUP_GBP, Math.ceil(shortfall * 100) / 100)
          : WALLET_MIN_TOPUP_GBP;
      setTopupAmountInput(String(pref));
    }
    if (open && mode === "topup") {
      setTopupAmountInput(String(WALLET_MIN_TOPUP_GBP));
    }
  }, [
    open,
    mode,
    status?.exists,
    status?.status,
    status?.balance,
    totalAmount,
  ]);

  const canUseWallet = isWalletRole(userRole) && Boolean(userId);
  const canPayTip =
    mode === "tip" &&
    totalAmount >= 1 &&
    Boolean(eventId) &&
    characters.length > 0;

  const parseTopupAmount = (): number | null => {
    const n = Number(topupAmountInput.replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(n) || n < WALLET_MIN_TOPUP_GBP) return null;
    return Math.round(n * 100) / 100;
  };

  const handleDebit = async () => {
    if (!eventId || pin.length !== 4) return;
    if (
      paymentSurface !== "event_room" &&
      paymentSurface !== "community_room" &&
      !paymentChannelId?.trim()
    ) {
      setErr(
        "This tip must be tied to the video you are watching. Open tips from the playing video and try again."
      );
      return;
    }
    setBusy(true);
    setErr(null);
    const debitIdentity: WalletDebitAttemptIdentity = {
      eventId,
      amount: totalAmount,
      characters,
      paymentSurface,
      paymentContentId: paymentChannelId?.trim() || undefined,
      communityId: paymentCommunityId?.trim() || undefined,
      videoFeatureCardId: videoFeatureCardId?.trim() || undefined,
      performerId: performerId ?? undefined,
      projectId: projectId ?? undefined,
      selectedTips,
      secondaryText: secondaryText || undefined,
    };
    const { idempotencyKey: idem } =
      planWalletDebitIdempotencyKey(debitIdentity);
    try {
      let tipQuoteId: string | undefined = resolveWalletDebitPendingTipQuoteId(
        debitIdentity
      );
      if (
        ensureTipQuoteId &&
        (paymentSurface === "event_room" ||
          paymentSurface === "community_room") &&
        mode === "tip"
      ) {
        if (!tipQuoteId) {
          tipQuoteId = await ensureTipQuoteId();
          if (tipQuoteId) {
            rememberWalletDebitPendingTipQuoteId(debitIdentity, tipQuoteId);
          }
        }
      }
      await debitWalletRequest({
        pin,
        amount: totalAmount,
        eventId,
        characters,
        selectedTips,
        secondaryText: secondaryText || undefined,
        paymentSurface,
        paymentContentId: paymentChannelId?.trim() || undefined,
        communityId: paymentCommunityId?.trim() || undefined,
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
        deviceCategory: getDeviceCategory(),
        clientSessionId: getAnalyticsSessionId(),
        idempotencyKey: idem,
        ...(videoFeatureCardId?.trim()
          ? { videoFeatureCardId: videoFeatureCardId.trim() }
          : {}),
        ...(tipQuoteId ? { tipQuoteId } : {}),
        ...(performerId ? { performerId } : {}),
        ...(projectId ? { projectId } : {}),
      });
      clearWalletDebitPendingIdempotency();
      void refresh();
      try {
        localStorage.removeItem("walletPendingTipAfterTopup");
        clearTipResumeCtx();
      } catch {
        /* ignore */
      }
      if (WALLET_DEBIT_IN_MODAL) {
        setDebitSuccess(true);
        onWalletDebitSuccess();
        setPin("");
        window.setTimeout(() => {
          setDebitSuccess(false);
          onOpenChange(false);
        }, 1400);
      } else {
        onWalletDebitSuccess();
        onOpenChange(false);
        setPin("");
      }
    } catch (e: unknown) {
      const httpStatus =
        e instanceof WalletDebitRequestError ? e.httpStatus : undefined;
      if (
        walletDebitFailureDisposition(httpStatus) === "clear_pending"
      ) {
        clearWalletDebitPendingIdempotency();
      }
      setErr(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setBusy(false);
    }
  };

  const handleCreatePin = async (kind: "activation" | "pin_reset") => {
    if (newPin.length !== 4 || newPin !== confirmPin) {
      setErr("PINs must match (4 digits)");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await setWalletPinRequest(newPin, kind);
      setNewPin("");
      setConfirmPin("");
      setForgotPinMode(false);
      setPinResetSent(kind === "pin_reset");
      await refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not start activation");
    } finally {
      setBusy(false);
    }
  };

  const handleStartCardTopup = async () => {
    setTopupLoading(true);
    setErr(null);
    try {
      const amt = parseTopupAmount();
      if (amt == null) {
        setErr(`Enter at least £${WALLET_MIN_TOPUP_GBP}`);
        setTopupLoading(false);
        return;
      }
      const standalone =
        WALLET_STANDALONE_TOPUP && (mode === "topup" || !eventId || !canPayTip);
      const topupEventId = standalone || !eventId ? undefined : eventId;

      const { client_secret } = await createWalletTopupIntentRequest({
        amount: amt,
        eventId: topupEventId,
      });

      savePaymentOrigin();

      const reopenEventId =
        (eventId?.trim() || topupEventId || "").trim() || null;
      writeWalletTopupReturnIntent(reopenEventId);

      if (mode === "tip" && eventId && canPayTip) {
        writeTipResumeCtx({
          eventId,
          paymentSurface,
          paymentContentId: paymentChannelId ?? null,
          selectedTips: [...selectedTips],
          secondaryText: secondaryText ?? "",
          textTipActive: selectedTips.includes("Comment"),
          walletLines: characters.map(c => ({ ...c })),
          walletTotal: totalAmount,
          exploreFeedTab: readExploreFeedTabFromLocation(),
        });
      }

      setTopupClientSecret(client_secret);
      setShowCardTopup(true);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Top-up failed");
    } finally {
      setTopupLoading(false);
    }
  };

  const stackNested =
    stackAboveTipDrawer === true || stackAboveImmersive === true;
  const overlayZ = stackAbovePlaybackOverlay
    ? PLAYBACK_OVERLAY_NESTED_MODAL_OVERLAY_Z_INDEX
    : stackNested
      ? DRAWER_NESTED_Z_INDEX
      : DRAWER_Z_INDEX;
  const contentZ = stackAbovePlaybackOverlay
    ? PLAYBACK_OVERLAY_NESTED_MODAL_Z
    : stackNested
      ? 99995
      : 99990;
  const contentClassZ = stackAbovePlaybackOverlay
    ? PLAYBACK_OVERLAY_NESTED_MODAL_Z_INDEX
    : overlayZ;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent
        overlayClassName={cn("bg-black/60", overlayZ)}
        className={cn("max-w-md rounded-xl bg-white", contentClassZ)}
        style={{ zIndex: contentZ }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <Wallet className="text-primary size-5" />
            Tipper Wallet
          </DialogTitle>
        </DialogHeader>

        {debitSuccess && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="text-primary size-14" />
            <p className="text-lg font-semibold">Tip sent</p>
            <p className="text-muted-foreground text-sm">
              £{totalAmount.toFixed(2)} paid from your wallet.
            </p>
          </div>
        )}

        {!debitSuccess && !canUseWallet && (
          <p className="text-muted-foreground text-sm">
            Sign in with your tipper account to use your wallet, view your
            balance, and pay in one tap after you have activated your wallet.
          </p>
        )}

        {!debitSuccess && canUseWallet && !status?.exists && !forgotPinMode && (
          <div className="space-y-3 text-sm">
            <p>
              Create a wallet with a 4-digit PIN. We will email you a link to
              activate it (valid 10 minutes).
            </p>
            <div className="flex gap-2">
              <input
                className="border-input w-full rounded-md border px-2 py-1"
                inputMode="numeric"
                maxLength={4}
                placeholder="PIN"
                value={newPin}
                onChange={e =>
                  setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
              />
              <input
                className="border-input w-full rounded-md border px-2 py-1"
                inputMode="numeric"
                maxLength={4}
                placeholder="Confirm"
                value={confirmPin}
                onChange={e =>
                  setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
              />
            </div>
            <Button
              type="button"
              className="w-full bg-black text-white"
              disabled={busy}
              onClick={() => void handleCreatePin("activation")}
            >
              Continue
            </Button>
          </div>
        )}

        {!debitSuccess &&
          canUseWallet &&
          status?.exists &&
          status.status === "DISABLED" && (
            <p className="text-sm text-red-700">
              Your Tipper Wallet is disabled. Please contact hello@tipmanna.tv
              for assistance.
            </p>
          )}

        {!debitSuccess &&
          canUseWallet &&
          status?.exists &&
          status.status === "PENDING_VERIFICATION" && (
            <p className="text-sm text-amber-800">
              {pinResetSent
                ? "Check your email to finish resetting your PIN (balance is preserved)."
                : "Waiting for you to click the activation link in your email. This page updates automatically when your wallet is activated."}
            </p>
          )}

        {!debitSuccess &&
          canUseWallet &&
          status?.exists &&
          status.status === "ACTIVE" && (
            <div className="space-y-3 text-sm">
              <p>
                Balance: <strong>£{Number(status.balance).toFixed(2)}</strong>
                {canPayTip && mode === "tip" && (
                  <>
                    {" "}
                    · Tip total: <strong>£{totalAmount.toFixed(2)}</strong>
                  </>
                )}
              </p>

              {(mode === "topup" ||
                (canPayTip && Number(status.balance) < totalAmount)) && (
                <div className="space-y-2">
                  <label className="text-xs font-medium">
                    Top-up amount (min £{WALLET_MIN_TOPUP_GBP})
                  </label>
                  <input
                    className="border-input w-full rounded-md border px-2 py-2"
                    inputMode="decimal"
                    value={topupAmountInput}
                    onChange={e => setTopupAmountInput(e.target.value)}
                  />
                  <p className="text-muted-foreground text-xs">
                    Any amount you add stays in your wallet for future tips.
                  </p>
                  {!showCardTopup && (
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full"
                      disabled={busy || topupLoading}
                      onClick={() => void handleStartCardTopup()}
                    >
                      {topupLoading ? "Preparing…" : "Add funds with card"}
                    </Button>
                  )}
                  {showCardTopup && topupClientSecret && (
                    <div className="space-y-2 border-t pt-3">
                      <WalletTopupStripeTree
                        clientSecret={topupClientSecret}
                        onConfirmError={msg => setErr(msg)}
                        onBeforeStripeWalletRedirect={
                          onBeforeStripeWalletRedirect
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setShowCardTopup(false);
                          setTopupClientSecret(null);
                        }}
                      >
                        Back
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {mode === "tip" &&
                canPayTip &&
                Number(status.balance) >= totalAmount &&
                !forgotPinMode && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Wallet PIN</label>
                    <input
                      className="border-input w-full rounded-md border px-2 py-2 tracking-widest"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="••••"
                      value={pin}
                      onChange={e =>
                        setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                      }
                    />
                    <button
                      type="button"
                      className="text-muted-foreground text-xs underline"
                      onClick={() => {
                        setForgotPinMode(true);
                        setErr(null);
                      }}
                    >
                      Forgot PIN?
                    </button>
                    <Button
                      type="button"
                      className="w-full bg-black text-white"
                      disabled={busy || pin.length !== 4}
                      onClick={() => void handleDebit()}
                    >
                      Pay £{totalAmount} with wallet
                    </Button>
                  </div>
                )}

              {mode === "tip" && forgotPinMode && (
                <div className="space-y-3 border-t pt-3">
                  <p className="text-sm">
                    Choose a new 4-digit PIN. We will email you a link to
                    confirm (your balance is safe).
                  </p>
                  <div className="flex gap-2">
                    <input
                      className="border-input w-full rounded-md border px-2 py-1"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="New PIN"
                      value={newPin}
                      onChange={e =>
                        setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                      }
                    />
                    <input
                      className="border-input w-full rounded-md border px-2 py-1"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="Confirm"
                      value={confirmPin}
                      onChange={e =>
                        setConfirmPin(
                          e.target.value.replace(/\D/g, "").slice(0, 4)
                        )
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    className="w-full bg-black text-white"
                    disabled={busy}
                    onClick={() => void handleCreatePin("pin_reset")}
                  >
                    Email me a reset link
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setForgotPinMode(false);
                      setNewPin("");
                      setConfirmPin("");
                    }}
                  >
                    Back
                  </Button>
                </div>
              )}

              {mode === "tip" && !canPayTip && (
                <p className="text-muted-foreground">
                  Select tips in the drawer first, then open the wallet again to
                  pay.
                </p>
              )}
            </div>
          )}

        {!debitSuccess &&
          canUseWallet &&
          status?.exists &&
          status.status === "LOCKED" &&
          !forgotPinMode && (
            <div className="space-y-3 text-sm">
              <p className="text-red-700">
                Wallet is temporarily locked after too many incorrect PIN
                attempts. Reset your PIN via email (you will choose a new PIN
                first).
              </p>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                disabled={busy}
                onClick={() => {
                  setForgotPinMode(true);
                  setErr(null);
                }}
              >
                Reset PIN via email
              </Button>
            </div>
          )}

        {!debitSuccess &&
          canUseWallet &&
          status?.exists &&
          status.status === "LOCKED" &&
          forgotPinMode && (
            <div className="space-y-3 text-sm">
              <p className="text-sm">
                Choose a new 4-digit PIN. We will email you a link to confirm
                (your balance is safe).
              </p>
              <div className="flex gap-2">
                <input
                  className="border-input w-full rounded-md border px-2 py-1"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="New PIN"
                  value={newPin}
                  onChange={e =>
                    setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                />
                <input
                  className="border-input w-full rounded-md border px-2 py-1"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="Confirm"
                  value={confirmPin}
                  onChange={e =>
                    setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                />
              </div>
              <Button
                type="button"
                className="w-full bg-black text-white"
                disabled={busy}
                onClick={() => void handleCreatePin("pin_reset")}
              >
                Email me a reset link
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => {
                  setForgotPinMode(false);
                  setNewPin("");
                  setConfirmPin("");
                }}
              >
                Back
              </Button>
            </div>
          )}

        {!debitSuccess &&
          canUseWallet &&
          status?.exists &&
          status.status === "INACTIVE" && (
            <div className="space-y-3 text-sm">
              <p>Set a 4-digit PIN to start wallet activation.</p>
              <div className="flex gap-2">
                <input
                  className="border-input w-full rounded-md border px-2 py-1"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="PIN"
                  value={newPin}
                  onChange={e =>
                    setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                />
                <input
                  className="border-input w-full rounded-md border px-2 py-1"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="Confirm"
                  value={confirmPin}
                  onChange={e =>
                    setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                />
              </div>
              <Button
                type="button"
                className="w-full bg-black text-white"
                disabled={busy}
                onClick={() => void handleCreatePin("activation")}
              >
                Send activation email
              </Button>
            </div>
          )}

        {err && <p className="text-sm text-red-600">{err}</p>}
      </DialogContent>
    </Dialog>
  );
}
