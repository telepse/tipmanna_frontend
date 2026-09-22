import Script from "next/script";
import type { ReactNode } from "react";

import { ScreenOverlayRouteChrome } from "@/components/events/screen-overlay-route-chrome";

import "./overlay.css";

export default function EventRoomOverlayLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <Script
        id="screen-overlay-transparent-root"
        strategy="beforeInteractive"
      >{`(function(){var d=document.documentElement;d.dataset.screenOverlayRoot="true";d.style.background="transparent";if(document.body)document.body.style.background="transparent";})();`}</Script>
      <ScreenOverlayRouteChrome>{children}</ScreenOverlayRouteChrome>
    </>
  );
}
