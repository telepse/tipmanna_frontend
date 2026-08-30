/**
 * Pick readable foreground colors for text/icons on an arbitrary hex background
 * (e.g. community header tint in dedicated / side-chick mode).
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const h = hex.trim().replace(/^#/, "");
  if (h.length === 3) {
    const r = parseInt(h[0] + h[0], 16);
    const g = parseInt(h[1] + h[1], 16);
    const b = parseInt(h[2] + h[2], 16);
    if ([r, g, b].some(n => Number.isNaN(n))) return null;
    return { r, g, b };
  }
  if (h.length === 6) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    if ([r, g, b].some(n => Number.isNaN(n))) return null;
    return { r, g, b };
  }
  return null;
}

function linearChannel(c: number): number {
  const x = c / 255;
  return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance 0–1 (sRGB). */
function luminance(rgb: { r: number; g: number; b: number }): number {
  const R = linearChannel(rgb.r);
  const G = linearChannel(rgb.g);
  const B = linearChannel(rgb.b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

export type ContrastFg = {
  /** Primary text / icons */
  foreground: string;
  /** Secondary / de-emphasized */
  mutedForeground: string;
};

/**
 * Returns dark text on light backgrounds and light text on dark backgrounds.
 */
export function pickContrastFgForHex(
  hex: string | null | undefined
): ContrastFg {
  if (!hex || typeof hex !== "string") {
    return { foreground: "#0a0a0a", mutedForeground: "rgba(10,10,10,0.72)" };
  }
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return { foreground: "#0a0a0a", mutedForeground: "rgba(10,10,10,0.72)" };
  }
  const L = luminance(rgb);
  if (L > 0.55) {
    return { foreground: "#0a0a0a", mutedForeground: "rgba(10,10,10,0.65)" };
  }
  return { foreground: "#fafafa", mutedForeground: "rgba(250,250,250,0.72)" };
}
