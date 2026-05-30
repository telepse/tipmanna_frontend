"use client";

import { useEffect, useRef, useState } from "react";

// Third-party imports
import { useSelector, useDispatch } from "react-redux";
import { X } from "lucide-react";

// Local imports
import { RootState } from "@/redux/store";
import { setSelectedTips } from "@/features/tip-slice";
import { truncateText } from "@/lib/utils";
import { stopPreview } from "@/lib/previewController";
import { clearTextTipDraftStorage } from "@/lib/tip-text-selection";

export const TipDisplay = () => {
  const { paymentCompleted, selectedTips } = useSelector(
    (state: RootState) => state.tip
  );
  const dispatch = useDispatch();
  const [textTipActive, setTextTipActive] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = () => {
      dispatch(setSelectedTips([]));
    };
    window.addEventListener("tip:dropped", handler);
    return () => window.removeEventListener("tip:dropped", handler);
  }, [dispatch]);

  // Auto-scroll with a smooth "swipe" animation when a new tip is added
  useEffect(() => {
    if (containerRef.current && selectedTips.length > 0) {
      const container = containerRef.current;

      // Wait for new DOM element to render
      setTimeout(() => {
        const maxScrollLeft = container.scrollWidth - container.clientWidth;

        // Animate toward the left (newest tip visible)
        container.scrollTo({
          left: maxScrollLeft * -1, // since flex-row-reverse visually flips direction
          behavior: "smooth",
        });

        // Alternatively, if flex direction causes issues:
        // container.scrollTo({ left: 0, behavior: "smooth" });
      }, 50);
    }
  }, [selectedTips]);

  if (selectedTips.length === 0)
    return <div className="text-muted-foreground text-xs"></div>;

  const uniqueLabels = Array.from(new Set(selectedTips));

  const removeAllOfTip = (characterName: string) => {
    if (characterName === "Text") {
      stopPreview();
      setTextTipActive(false);
      clearTextTipDraftStorage();
    }
    const updated = selectedTips.filter(name => name !== characterName);
    dispatch(setSelectedTips(updated));
  };

  return (
    <div
      ref={containerRef}
      className="scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent mt-0 ml-auto flex flex-row-reverse items-center justify-center gap-2 overflow-x-auto overflow-y-hidden scroll-smooth px-1 py-2 text-sm whitespace-nowrap sm:mt-4 lg:mt-0"
    >
      {uniqueLabels.map(label => {
        // const displayLabel = label === "Comedy Mask" ? "Mask" : label;
        const displayLabel = label;
        return (
          <span
            key={label}
            className={`flex shrink-0 items-center rounded-md bg-black px-2 py-1 text-xs whitespace-nowrap text-white sm:text-sm ${paymentCompleted ? "cursor-not-allowed opacity-50" : ""}`}
          >
            {displayLabel === "Comedy Mask" ? (
              <>{truncateText(displayLabel, 4)}</>
            ) : (
              <>{displayLabel}</>
            )}
            <button
              type="button"
              className="text-md ml-1 rounded-full px-1 text-xs text-white focus:outline-none"
              disabled={paymentCompleted}
              onClick={() => removeAllOfTip(displayLabel)}
              aria-label={`Remove all ${displayLabel}`}
            >
              <X className="size-4" />
            </button>
          </span>
        );
      })}
    </div>
  );
};
