"use client";

import { useEffect, type ReactNode } from "react";

/**
 * Marks document root transparent for OBS browser sources on /room/:id/overlay only.
 */
export function ScreenOverlayRouteChrome({
  children,
}: {
  children: ReactNode;
}) {
  useEffect(() => {
    const html = document.documentElement;
    const prevHtmlBg = html.style.background;
    const prevBodyBg = document.body.style.background;
    html.dataset.screenOverlayRoot = "true";
    html.style.background = "transparent";
    document.body.style.background = "transparent";

    return () => {
      delete html.dataset.screenOverlayRoot;
      html.style.background = prevHtmlBg;
      document.body.style.background = prevBodyBg;
    };
  }, []);

  return <>{children}</>;
}
