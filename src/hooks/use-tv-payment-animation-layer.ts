"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

import { tvTrace } from "@/lib/tvDebugLog";

export type TvPaymentLayerMetrics = {
  w: number;
  h: number;
  scale: number;
  mode: "player_bounds" | "viewport_scaled";
};

/**
 * Scales payment animations to the TV player column.
 * Mobile full-view uses player bounds directly (no viewport transform) for iOS stability.
 */
export function useTvPaymentAnimationLayer(options: {
  playerAreaRef: RefObject<HTMLElement | null>;
  isMobileTv: boolean;
  isFullView: boolean;
  /** Re-run ResizeObserver when schedule item / layout changes. */
  layoutKey: string | number;
}): {
  animationMountRef: RefObject<HTMLDivElement | null>;
  paymentLayerMetrics: TvPaymentLayerMetrics;
  usePlayerBoundsLayer: boolean;
} {
  const { playerAreaRef, isMobileTv, isFullView, layoutKey } = options;
  const animationMountRef = useRef<HTMLDivElement | null>(null);
  const usePlayerBoundsLayer = isMobileTv && isFullView;
  const [paymentLayerMetrics, setPaymentLayerMetrics] =
    useState<TvPaymentLayerMetrics>({
      w: 1920,
      h: 1080,
      scale: 1,
      mode: "viewport_scaled",
    });

  useEffect(() => {
    if (isMobileTv && !isFullView) return;
    const el = playerAreaRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      if (usePlayerBoundsLayer) {
        const w = Math.max(1, Math.round(rect.width));
        const h = Math.max(1, Math.round(rect.height));
        setPaymentLayerMetrics({
          w,
          h,
          scale: 1,
          mode: "player_bounds",
        });
        tvTrace("fullscreen", "payment_layer_metrics", {
          mode: "player_bounds",
          w,
          h,
          scale: 1,
        });
        return;
      }

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const scale = Math.min(rect.width / vw, rect.height / vh, 1) || 0.001;
      setPaymentLayerMetrics({
        w: vw,
        h: vh,
        scale,
        mode: "viewport_scaled",
      });
    };

    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    update();
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [layoutKey, isMobileTv, isFullView, usePlayerBoundsLayer, playerAreaRef]);

  return {
    animationMountRef,
    paymentLayerMetrics,
    usePlayerBoundsLayer,
  };
}
