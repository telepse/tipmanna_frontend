export type ScreenFunnelPosition =
  | "bottom_left"
  | "bottom_right"
  | "top_left"
  | "top_right";

export const SCREEN_FUNNEL_POSITIONS: {
  value: ScreenFunnelPosition;
  label: string;
}[] = [
  { value: "top_left", label: "Top left" },
  { value: "top_right", label: "Top right" },
  { value: "bottom_left", label: "Bottom left" },
  { value: "bottom_right", label: "Bottom right" },
];

export function normalizeScreenFunnelPosition(
  raw: unknown
): ScreenFunnelPosition {
  if (
    raw === "bottom_left" ||
    raw === "bottom_right" ||
    raw === "top_left" ||
    raw === "top_right"
  ) {
    return raw;
  }
  return "bottom_left";
}

export function funnelCornerClassName(
  position: ScreenFunnelPosition,
  variant: "opaque" | "overlay",
  isMobile = false
): string {
  if (variant === "overlay") {
    switch (position) {
      case "top_left":
        return "absolute top-[2vmin] left-[2vmin]";
      case "top_right":
        return "absolute top-[2vmin] right-[2vmin]";
      case "bottom_right":
        return "absolute bottom-[2vmin] right-[2vmin]";
      case "bottom_left":
      default:
        return "absolute bottom-[2vmin] left-[2vmin]";
    }
  }

  switch (position) {
    case "top_left":
      return "absolute top-4 left-4";
    case "top_right":
      return "absolute top-4 right-4";
    case "bottom_right":
      return "absolute bottom-4 right-4";
    case "bottom_left":
    default:
      return isMobile ? "absolute bottom-2 left-2" : "absolute bottom-4 left-4";
  }
}
