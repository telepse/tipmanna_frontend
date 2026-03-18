"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Image from "next/image";

// Third-party imports
import { ChevronsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { useStripe, useElements } from "@stripe/react-stripe-js";

// Local imports
import { TipDrawer } from "@/components/events/tip-drawer";
import { RootState } from "@/redux/store";
import { useRouter } from "next/navigation";
import { setSelectedTips } from "@/features/tip-slice";
import { ANIMATION_DURATION } from "@/lib/animationContract";
import { startPreview } from "@/lib/previewController";

// Animation style imports
import { confettiStyle } from "@/animation-styles/confetti";
import { popAndShootStyle } from "@/animation-styles/pop-and-shoot";
import { floatStyle } from "@/animation-styles/float";
import { fallStyle } from "@/animation-styles/fall";
import { burstStyle } from "@/animation-styles/burst";
import { screenShakeStyle } from "@/animation-styles/screen-shake";
import { spinStyle } from "@/animation-styles/spin";
import { AnimationHandle } from "@/types/animation.types";

interface Props {
  eventId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tippingCharacters: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  characterSets: any[];
}

const EMPTY_HANDLE: AnimationHandle = {
  start: () => {},
  stop: () => {},
  finished: Promise.resolve(),
};

export const TipSection = ({
  eventId,
  tippingCharacters,
  characterSets,
}: Props) => {
  const [openDrawer, setOpenDrawer] = useState(false);
  const { paymentCompleted } = useSelector((state: RootState) => state.tip);
  const { selectedTips } = useSelector((state: RootState) => state.tip);

  // Stripe payments
  const [textTipActive, setTextTipActive] = useState(false);
  const [textTipValue] = useState("");

  const dispatch = useDispatch();

  const allTips = useMemo(() => {
    return [...tippingCharacters];
  }, [tippingCharacters]);

  const makeTipSelection = (characterId: string) => {
    // ─────────────────────────────
    // Text Tip (separate logic)
    // ─────────────────────────────
    if (characterId === process.env.NEXT_TEXT_CHARACTER_ID) {
      setTextTipActive(true);

      if (!selectedTips.includes("Text")) {
        dispatch(setSelectedTips([...selectedTips, "Text"]));
      }

      return;
    }

    const character = tippingCharacters.find(c => c.id === characterId);
    if (!character) return;

    dispatch(setSelectedTips([...selectedTips, character.name]));

    if (!character.styleName) {
        console.error("Missing styleName for character", character);
        return;
      }

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

  const totalAmount = useMemo(() => {
    return selectedTips.reduce((acc, characterName) => {
      if (characterName === "Text") {
        return acc + 5;
      }
      const character = tippingCharacters.find(c => c.name === characterName);
      return acc + (character?.price || 0);
    }, 0);
  }, [selectedTips, tippingCharacters]);

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

  const router = useRouter();

  useEffect(() => {
    router.prefetch("/success");
  }, [router]);

  const [progress, setProgress] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      const scrollLeft = el.scrollLeft;
      const scrollWidth = el.scrollWidth - el.clientWidth;
      const percentage = (scrollLeft / scrollWidth) * 100;
      setProgress(percentage);
    };

    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

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

  const handleOpenDrawer = async () => {
    if (stripeLoading) {
      toast.error("Payment system is still loading...");
      return;
    }

    if (totalAmount <= 0) {
      toast.error("Please select at least one tip item");
      return;
    }

    // NEW: Set loading state and wait for Stripe to be ready
    setIsOpeningDrawer(true);

    // Wait for Stripe to be fully ready
    if (!stripe || !elements) {
      toast.error("Payment system not ready yet");
      setIsOpeningDrawer(false);
      return;
    }

    // Small delay to ensure smooth UX
    await new Promise(resolve => setTimeout(resolve, 100));

    // Now open the drawer
    setOpenDrawer(true);
    setIsOpeningDrawer(false);
  };

  return (
    <div className="space-y-2">
      {/* Payment options */}
      <div className="bg-card relative flex flex-col items-center justify-between gap-2 rounded-tl-2xl rounded-tr-2xl border p-1">
        <div className="flex items-center gap-2">
          <Button
            size="lg"
            onClick={() => setOpenDrawer(true)}
            disabled={paymentCompleted || stripeLoading || isOpeningDrawer}
            className="relative -mt-1 mb-2 flex h-6 w-fit justify-center rounded-tl-2xl rounded-tr-2xl bg-transparent text-sm text-black"
          >
            <ChevronsUp className="text-primary" /> Tip or Donate{" "}
            <ChevronsUp className="text-primary" />
            <span
              style={{
                transform: "scaleX(1)",
              }}
              className="absolute right-18 -bottom-0.5 left-18 h-0.5 origin-left rounded-full bg-black"
            ></span>
          </Button>
        </div>

        <div className="relative w-full overflow-x-auto scroll-smooth">
          <div
            className="hide__scrollbar scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent flex h-24 min-w-max snap-x snap-mandatory flex-wrap content-start gap-1 overflow-x-auto px-1"
            style={{ rowGap: "1rem" }}
            ref={scrollRef}
          >
            {allTips.map(character => {
              const characterName =
                character.id === `${process.env.NEXT_TEXT_CHARACTER_ID}`
                  ? "Text"
                  : character.name;
              const count = getSelectedCount(characterName);

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
                  {count > 0 && (
                    <div className="bg-gray absolute top-0 right-0 rounded-full px-2 py-1 text-xs font-bold text-black">
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
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          disabled={
            paymentCompleted ||
            stripeLoading ||
            totalAmount <= 0 ||
            isOpeningDrawer // NEW: Add isOpeningDrawer to disabled conditions
          }
          className={`flex-1 bg-black text-white ${totalAmount > 0 ? "" : "opacity-50"}`}
          onClick={handleOpenDrawer}
        >
          {isOpeningDrawer
            ? "Loading..."
            : stripeLoading
              ? "Loading..."
              : `Pay £${totalAmount}`}{" "}
          {/* NEW: Show loading when opening drawer */}
        </Button>
      </div>

      {/* Tip drawer */}
      <TipDrawer
        open={openDrawer}
        onOpenChange={setOpenDrawer}
        eventId={eventId}
        tippingCharacters={tippingCharacters}
        characterSets={characterSets}
      />
    </div>
  );
};
