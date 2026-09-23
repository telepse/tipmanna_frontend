export type TipLinkTickerMode = "scroll" | "enlarge" | "landscapeOverlay";

export function resolveTipLinkTickerMode(input: {
  isLandscapeEnlarge: boolean;
  isEnlargeMode: boolean;
}): TipLinkTickerMode {
  if (input.isLandscapeEnlarge) return "landscapeOverlay";
  if (input.isEnlargeMode) return "enlarge";
  return "scroll";
}

export function tipLinkTickerExtras(mode: TipLinkTickerMode): {
  hideActionLabels: boolean;
  showNavActions: boolean;
} {
  return {
    hideActionLabels: mode !== "scroll",
    showNavActions: mode === "landscapeOverlay",
  };
}
