/** True on iOS Safari when not running as an installed PWA (web push requires add-to-homescreen). */
export function isIosSafariNonStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (!window.navigator?.userAgent) return false;

  const ua = window.navigator.userAgent;
  const isIos =
    /iPad|iPhone|iPod/.test(ua) ||
    (ua.includes("Mac") && "ontouchend" in document);
  if (!isIos) return false;

  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator &&
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true);

  return !standalone;
}

export function isFirefox(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Firefox\//i.test(navigator.userAgent);
}

export function isAndroidChromium(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /Android/i.test(ua) && /Chrome\//i.test(ua);
}

export function isDesktopSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isSafari =
    /Safari\//i.test(ua) && !/Chrome|CriOS|FxiOS|Edg\//i.test(ua);
  const isDesktop = !/iPhone|iPad|iPod|Android/i.test(ua);
  return isSafari && isDesktop && !isIosSafariNonStandalone();
}

export type PwaInstallInstructionVariant =
  | "ios"
  | "firefox"
  | "android"
  | "desktop-safari"
  | "default";

export function getPwaInstallInstructionVariant(): PwaInstallInstructionVariant {
  if (isIosSafariNonStandalone()) return "ios";
  if (isFirefox()) return "firefox";
  if (isAndroidChromium()) return "android";
  if (isDesktopSafari()) return "desktop-safari";
  return "default";
}

export function getPwaInstallInstructions(options?: { forPush?: boolean }): {
  variant: PwaInstallInstructionVariant;
  steps: string[];
  title: string;
} {
  const variant = getPwaInstallInstructionVariant();
  const pushSuffix = options?.forPush
    ? " Then open Tipmanna and turn on notifications."
    : "";

  if (variant === "ios") {
    return {
      variant,
      title: "On iPhone or iPad:",
      steps: [
        "Tap the Share button in Safari.",
        'Choose "Add to Home Screen".',
        `Open Tipmanna from your home screen${options?.forPush ? ", then turn on notifications" : "."}`,
      ],
    };
  }
  if (variant === "firefox") {
    return {
      variant,
      title: "In Firefox:",
      steps: [
        "Open the browser menu (three lines).",
        'Choose "Install" or "Add to Home screen".',
        `Launch Tipmanna from your apps list${pushSuffix || " for the best experience."}`,
      ],
    };
  }
  if (variant === "android") {
    return {
      variant,
      title: "On Android Chrome:",
      steps: [
        "Tap the menu (three dots) or use the Install banner when shown.",
        'Choose "Install app" or "Add to Home screen".',
        `Open Tipmanna from your home screen${pushSuffix || "."}`,
      ],
    };
  }
  if (variant === "desktop-safari") {
    return {
      variant,
      title: "In Safari on Mac:",
      steps: [
        "Click File in the menu bar (or Share on iPad keyboard).",
        'Choose "Add to Dock" (Safari 17+) or share to Add to Home Screen.',
        `Open Tipmanna from the Dock or home screen${pushSuffix || "."}`,
      ],
    };
  }
  return {
    variant,
    title: "Install Tipmanna:",
    steps: [
      "Use the Install button when your browser offers it.",
      "Or open the browser menu and choose Add to Home screen / Install app.",
      options?.forPush
        ? "Open the installed app, then turn on notifications."
        : "Launch from your home screen or apps list for the best experience.",
    ],
  };
}
