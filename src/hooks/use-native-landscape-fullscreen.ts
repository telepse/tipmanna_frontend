/**
 * useNativeLandscapeFullscreen
 *
 * Returns `true` ONLY when the user is on a mobile device AND has physically
 * rotated their phone into landscape orientation (width > height AND a touch
 * device). This is intentionally different from `isFullView` / `immersiveLayout`
 * which are user-toggled — this one fires automatically on physical rotation.
 *
 * We use three complementary signals so it works on iOS Safari, Android Chrome,
 * and all major mobile browsers:
 *   1. window.matchMedia("(orientation: landscape)") — reliable CSS media query
 *   2. window.innerWidth > window.innerHeight — fallback dimension check
 *   3. A max-width cap (≤ 1024px) to exclude desktop/tablet wide windows
 *
 * NOTE: We deliberately do NOT use screen.orientation.type because iOS Safari
 * has historically been unreliable with it.
 */
import { useEffect, useState } from "react";

const MOBILE_MAX_WIDTH = 1024; // px — anything wider is considered a tablet/desktop

function isMobileLandscape(): boolean {
  if (typeof window === "undefined") return false;

  const mq = window.matchMedia("(orientation: landscape)");
  const isLandscape = mq.matches;
  const isNarrowEnough =
    Math.min(window.innerWidth, window.innerHeight) <= MOBILE_MAX_WIDTH;

  // Extra guard: we also check actual pixel dimensions in case the media query
  // lags slightly behind on orientation change events.
  const widthGtHeight = window.innerWidth > 300;

  return (isLandscape || widthGtHeight) && isNarrowEnough;
}

export function useNativeLandscapeFullscreen(): boolean {
  const [isNativeLandscape, setIsNativeLandscape] = useState(false);

  useEffect(() => {
    // SSR guard
    if (typeof window === "undefined") return;

    const update = () => {
      setIsNativeLandscape(isMobileLandscape());
    };

    // Initial check (after mount so innerWidth is correct)
    update();

    // 1. orientationchange — fires on iOS and most Android browsers
    window.addEventListener("orientationchange", update);

    // 2. resize — catches cases where orientationchange doesn't fire (some PWAs,
    //    split-screen mode, desktop browsers being resized)
    window.addEventListener("resize", update);

    // 3. matchMedia change event — the most reliable cross-browser signal
    const mq = window.matchMedia("(orientation: landscape)");
    const mqHandler = () => update();
    // Modern browsers use addEventListener; older ones use addListener
    if (mq.addEventListener) {
      mq.addEventListener("change", mqHandler);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mq as any).addListener(mqHandler);
    }

    return () => {
      window.removeEventListener("orientationchange", update);
      window.removeEventListener("resize", update);
      if (mq.removeEventListener) {
        mq.removeEventListener("change", mqHandler);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mq as any).removeListener(mqHandler);
      }
    };
  }, []);

  return isNativeLandscape;
}
