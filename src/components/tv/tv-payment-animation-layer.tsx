import type { CSSProperties } from "react";

export type TvPaymentLayerMetrics = {
  w: number;
  h: number;
  scale: number;
  mode: "player_bounds" | "viewport_scaled";
};

export function tvPaymentAnimationLayerStyle(
  metrics: TvPaymentLayerMetrics,
  usePlayerBoundsLayer: boolean
): CSSProperties {
  if (usePlayerBoundsLayer) {
    return {
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
    };
  }

  return {
    width: metrics.w,
    height: metrics.h,
    transformOrigin: "top left",
    transform: `scale(${metrics.scale})`,
    position: "relative",
  };
}
