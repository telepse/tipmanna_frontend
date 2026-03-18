"use client";

import { useEffect } from "react";
import { useMemo, useState } from "react";
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
import Cookies from "js-cookie";
import { useMediaQuery } from "react-responsive";
import { BeatLoader } from "react-spinners";
import {
  ExpressCheckoutElement,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";

// Local imports
import { setSelectedTips } from "@/features/tip-slice";
import { createVisitorTipperAction } from "@/actions/visitors";
import { setCredentials } from "@/features/auth-slice";
import { Button } from "@/components/ui/button";

// Animation style imports
import { confettiStyle } from "@/animation-styles/confetti";
import { popAndShootStyle } from "@/animation-styles/pop-and-shoot";
import { floatStyle } from "@/animation-styles/float";
import { fallStyle } from "@/animation-styles/fall";
import { burstStyle } from "@/animation-styles/burst";
import { screenShakeStyle } from "@/animation-styles/screen-shake";
import { spinStyle } from "@/animation-styles/spin";
import { startPreview } from "@/lib/previewController";
import { ANIMATION_DURATION } from "@/lib/animationContract";
import { AnimationHandle } from "@/types/animation.types";

interface Character {
  id: string;
  name: string;
  iconUrl: string;
  price: number;
  styleName?:
    | "Confetti"
    | "Pop and Shoot"
    | "Fall"
    | "Burst"
    | "Screen Shake"
    | "Luxurious"
    | "Float"
    | "Spin";
}

const EMPTY_HANDLE: AnimationHandle = {
  start: () => {},
  stop: () => {},
  finished: Promise.resolve(),
};

export const TipDrawer = ({
  open,
  onOpenChange,
  eventId,
  tippingCharacters = [],
  characterSets = [],
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  eventId?: string;
  tippingCharacters?: Character[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  characterSets?: any[];
}) => {
  const [textTipActive, setTextTipActive] = useState(false);
  const [textTipValue, setTextTipValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [isLoadingPaymentOptions, setIsLoadingPaymentOptions] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);

  const filteredCharacterSets = useMemo(() => {
    const filtered = characterSets.filter(set => set.characters.length > 0);

    // Sort "General" first, others keep original order
    filtered.sort((a, b) => {
      if (a.name === "General") return -1;
      if (b.name === "General") return 1;
      return 0;
    });

    return filtered;
  }, [characterSets]);

  const router = useRouter();

  const user = useSelector((state: RootState) => state.auth.user);
  const userId = user?.id;
  const role = user?.role;

  const dispatch = useDispatch();
  const { paymentCompleted, selectedTips } = useSelector(
    (state: RootState) => state.tip
  );

  const [isElementReady, setIsElementReady] = useState(false);
  const [showDefaultPayButton, setShowDefaultPayButton] = useState(true);

  

  const makeTipSelection = (characterId: string) => {
    // ─────────────────────────────
    // Text Tip (separate logic)
    // ─────────────────────────────
    if (characterId === "b3fd81b5-6743-42cb-8df7-c08606bcd43b") {
      setTextTipActive(true);

      if (!selectedTips.includes("Text")) {
        dispatch(setSelectedTips([...selectedTips, "Text"]));
      }

      return;
    }

    

    const character = tippingCharacters.find(c => c.id === characterId);
    if (!character) return;

    if (!character.styleName) {
        console.error("Missing styleName for character", character);
        return;
      }

    dispatch(setSelectedTips([...selectedTips, character.name]));

    // ─────────────────────────────
    // Start Preview (auto-cancels previous)
    // ─────────────────────────────
    startPreview(() => {
      switch (character.styleName) {
        case "Confetti":
          return confettiStyle({
            tips: [character.name],
            mode: "preview",
          });

        case "Pop and Shoot":
          return popAndShootStyle({
            icons: [character.iconUrl],
            mode: "preview",
          });

        case "Float":
          return floatStyle({
            icons: [character.iconUrl],
            mode: "preview",
            duration: ANIMATION_DURATION.preview.default,
          });

        case "Burst":
          return burstStyle({
            icons: [character.iconUrl],
            spread: 300,
            duration: ANIMATION_DURATION.preview.default,
            mode: "preview",
          });

        case "Screen Shake":
          return screenShakeStyle({
            icons: [character.iconUrl],
            duration: ANIMATION_DURATION.preview.default,
            target: document.body,
            mode: "preview",
          });

        case "Fall":
          return fallStyle({
            icons: [character.iconUrl],
            fallCount: 10,
            duration: ANIMATION_DURATION.preview.default,
            mode: "preview",
          });

        case "Spin":
        case "Luxurious":
          return spinStyle({
            icons: [character.iconUrl],
            mode: "preview",
          });

        default:
          console.warn(
            `No preview animation defined for style: ${character.styleName}`
          );
          return EMPTY_HANDLE;
      }
    });
  };

  const removeAllOfTip = (characterName: string) => {
    const updated = selectedTips.filter(name => name !== characterName);
    dispatch(setSelectedTips(updated));
    if (characterName === "Text") setTextTipActive(false);
  };

  const totalAmount = useMemo(() => {
    return selectedTips.reduce((acc, characterName) => {
      if (characterName === "Text") {
        return acc + 5;
      }
      const character = tippingCharacters.find(c => c.name === characterName);
      return acc + (character?.price || 0);
    }, 0);
  }, [selectedTips, tippingCharacters]);

  const characters = useMemo(() => {
    const characterCounts: Record<string, number> = {};

    selectedTips
      .filter(name => name !== "Text")
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

    if (textTipActive || selectedTips.includes("Text")) {
      chars.push({
        name: "Text",
        price: 5,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        characterId: `${process.env.NEXT_TEXT_CHARACTER_ID}`,
      });
    }

    return chars;
  }, [selectedTips, textTipActive, tippingCharacters]);

  useEffect(() => {
    const amount = selectedTips.reduce((acc, characterName) => {
      if (characterName === "Text") {
        return acc + 5;
      }
      const character = tippingCharacters.find(c => c.name === characterName);
      return acc + (character?.price || 0);
    }, 0);

    localStorage.setItem("amount", amount.toString());
  }, [totalAmount, textTipActive, selectedTips, tippingCharacters]);

  useEffect(() => {
    if (textTipActive && textTipValue) {
      localStorage.setItem("textTipValue", textTipValue);
    }
  }, [textTipValue, textTipActive]);

  const getSelectedCount = (characterName: string) => {
    return selectedTips.filter(name => name === characterName).length;
  };

  // Stripe payments
  const stripe = useStripe();
  const elements = useElements();
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const handleDefaultPayButton = async () => {
    await onConfirm();
  };

  const onConfirm = async () => {
    if (!stripe || !elements) {
      // Stripe.js hasn't loaded yet.
      return;
    }

    if (isProcessing || isRedirecting) return;

    setIsProcessing(true);

    let finalUserId = userId;
    let finalRole = role;

    // If user is not logged in, create a visitor/tipper account
    if (!userId) {
      const visitorRes = await createVisitorTipperAction();

      if (!visitorRes || !visitorRes.visitor) {
        setErrorMessage("Unable to create visitor account");
        setIsProcessing(false);
        return;
      }

      const { id, fullName, email, username } = visitorRes.visitor;
      const token = visitorRes.token;

      if (visitorRes.visitor) {
        dispatch(
          setCredentials({
            user: {
              id,
              fullName,
              email,
              username,
              role: "VISITOR",
            },
            token,
          })
        );
        finalUserId = visitorRes.visitor.id;
        finalRole = "VISITOR";

        // const fiveMinuteFromNow = new Date(Date.now() + 3 * 60 * 1000);
        // Store in cookies (for persistence)
        Cookies.set(
          "user",
          JSON.stringify({
            id,
            fullName,
            email,
            username,
            role: "VISITOR",
          }),
          {
            expires: 1,
          }
        );

        Cookies.set("token", token, { expires: 1 });
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
          amount: Number(totalAmount),
          eventId,
          userId: finalUserId,
          role: finalRole,
          characters,
          confirmationTokenId: confirmationToken?.id,
        }),
      }
    );

    const data = await res.json();

    if (!data?.client_secret) {
      setErrorMessage("Payment could not be initiated.");
      setIsProcessing(false);
      return;
    }

    const clientSecret = data.client_secret;

    setIsRedirecting(true);
    setIsProcessing(true);

    // Confirm the PaymentIntent
    const { error: confirmError } = await stripe.confirmPayment({
      clientSecret,
      confirmParams: {
        confirmation_token: confirmationToken?.id,
        return_url: `${process.env.NEXT_PUBLIC_FRONTEND_APP_URL}/success`,
      },
    });

    if (confirmError) {
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

  // Show default pay button when Stripe is not ready, hide when element is ready
  useEffect(() => {
    if (isElementReady) {
      // Small delay for smooth transition
      const timer = setTimeout(() => {
        setShowDefaultPayButton(false);
        setIsLoadingPaymentOptions(false);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setShowDefaultPayButton(true);
    }
  }, [isElementReady]);

  const canPay = totalAmount > 0 && !paymentCompleted;

  const options = {
    layout: {
      type: "tabs",
      defaultCollapsed: false,
      radios: false,
      maxColumns: isMobile ? 2 : 3,
      maxRows: isMobile ? 3 : 2,
      showOverflowMenu: true,
    },
    buttonHeight: 40,
  };

  const LoadingOverlay = () => (
    <div
      className="fixed inset-0 z-[99999999999] flex flex-col items-center justify-center bg-white"
      style={{ zIndex: 99999999999 }}
    >
      <BeatLoader color="#f57d11" />
    </div>
  );

  return (
    <>
      {(isProcessing || isRedirecting) && <LoadingOverlay />}

      <Drawer
        open={open && !isRedirecting}
        onOpenChange={open => {
          if (isProcessing || isRedirecting) return;
          onOpenChange(open);
        }}
      >
        <DrawerContent
          className="bg-card z-[9999999999] space-y-2 border p-6 shadow-sm"
          style={{ zIndex: 9999999999 }}
        >
          <div className="flex justify-between gap-2 border p-2">
            <div className="bg-secondary/20 text-primary flex flex-col items-center justify-center rounded-md p-2 text-xs font-semibold">
              £{totalAmount}
            </div>

            {selectedTips.length > 0 && !paymentCompleted && (
              <div className="flex w-20 items-center overflow-visible text-[12px] leading-3 font-medium sm:text-[12px] md:w-60">
                Pay to send
              </div>
            )}

            <div
              className={`scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent flex flex-1 items-center gap-2 overflow-x-auto overflow-y-visible rounded-md border text-sm`}
            >
              {textTipActive && (
                <input
                  type="text"
                  className="mr-2 rounded-md border border-orange-500 px-2 py-1 text-black"
                  placeholder="Type your text..."
                  value={textTipValue}
                  onChange={e => setTextTipValue(e.target.value)}
                  autoFocus
                  maxLength={15}
                />
              )}
              <div className="flex flex-1 flex-row-reverse gap-2">
                <div className="scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent ml-auto flex flex-row-reverse items-center gap-1 overflow-x-auto scroll-smooth px-1 py-2 text-sm whitespace-nowrap">
                  {(selectedTips.includes("Text") || textTipActive) && (
                    <span
                      key="Text"
                      className="relative mr-1 flex items-center gap-1 rounded-full bg-black px-2 py-1 whitespace-nowrap text-white"
                    >
                      Text
                      <button
                        type="button"
                        className="text-md ml-1 rounded-full px-1 text-xs text-white focus:outline-none"
                        onClick={() => removeAllOfTip("Text")}
                        aria-label="Remove all Text"
                      >
                        x
                      </button>
                    </span>
                  )}
                  {selectedTips.length > 0 &&
                    Array.from(new Set(selectedTips))
                      .filter(characterName => characterName !== "Text")
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
                  {selectedTips.length === 0 && !textTipActive && (
                    <span className="text-muted-foreground text-xs"></span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <h6 className="text-xl font-semibold">Select tips</h6>

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
                    const characterName =
                      character.id === `${process.env.NEXT_TEXT_CHARACTER_ID}`
                        ? "Text"
                        : character.name;
                    const count = getSelectedCount(characterName);
                    const isTextTip =
                      character.id === `${process.env.NEXT_TEXT_CHARACTER_ID}`;

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

                        <h5 className="mt-0.5 text-center text-xs font-medium whitespace-nowrap">
                          {character.name.substring(0, 7)}
                        </h5>
                        <p className="text-muted-foreground absolute -bottom-5 left-1/2 -translate-x-1/2 overflow-visible rounded-full border border-black border-t-transparent border-r-transparent border-l-transparent bg-white p-0.5 text-xs">
                          £{character.price}
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

            {/* Default Pay Button - Shows initially when drawer opens via "Tip or Donate" */}
            <div
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
                  `Pay £${totalAmount}`
                )}
              </Button>
            </div>

            {/* Stripe Payment Element - Shows when ready, replaces default button */}
            <div
              className={`transition-all duration-300 ${
                !showDefaultPayButton && canPay && !isLoadingPaymentOptions
                  ? "opacity-100"
                  : "max-h-0 overflow-hidden opacity-0"
              }`}
              id="stripe-wrapper"
            >
              <ExpressCheckoutElement
                options={options}
                onReady={() => {
                  setIsElementReady(true);
                  setIsLoadingPaymentOptions(false);
                }}
                onConfirm={async e => {
                  await onConfirm();
                }}
              />
            </div>

            {/* Pay with card button - Shows when Stripe is ready */}
            {canPay && !isLoadingPaymentOptions && (
              <div
                className="z-[99999999] w-full"
                style={{ zIndex: 99999999 }}
              >
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

          {/* CARD PAYMENT MODAL */}
          <Dialog
            open={cardModalOpen}
            onOpenChange={setCardModalOpen}
          >
            <DialogContent
              className="max-w-md rounded-xl bg-white p-6"
              style={{ zIndex: 9999 }}
            >
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold">
                  Pay with card
                </DialogTitle>
              </DialogHeader>

              {/* Stripe Card Form */}
              <PaymentElement />

              <Button
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
                  `Pay £${totalAmount}`
                )}
              </Button>
            </DialogContent>
          </Dialog>

          {errorMessage && <div>{errorMessage}</div>}
        </DrawerContent>
      </Drawer>
    </>
  );
};
