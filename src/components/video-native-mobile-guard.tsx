"use client";

import { useEffect } from "react";
import {
  patchNativeVideoElement,
  VIDEO_RESTRICTION_MARK,
} from "@/lib/native-video-patch";

/**
 * Global enforcement for native `<video>` elements.
 *
 * - `playsinline` / `webkit-playsinline`: required on iOS or video exits to system fullscreen.
 * - MutationObserver: React and infinite scroll inject videos after mount; attribute observer
 *   catches re-renders that reset `src` / `controls`.
 * - YouTube/iframes cannot use these DOM properties — chromeless embed config is separate.
 * - Firefox may still expose PiP via UI in some builds; this is best-effort.
 */
export function VideoNativeMobileGuard() {
  useEffect(() => {
    const applyAll = () => {
      document.querySelectorAll("video").forEach(node => {
        patchNativeVideoElement(node as HTMLVideoElement);
      });
    };

    applyAll();

    const observer = new MutationObserver(mutations => {
      for (const m of mutations) {
        if (m.type === "attributes" && m.target.nodeName === "VIDEO") {
          patchNativeVideoElement(m.target as HTMLVideoElement);
          continue;
        }
        for (const node of m.addedNodes) {
          if (node.nodeName === "VIDEO") {
            patchNativeVideoElement(node as HTMLVideoElement);
          } else if (node instanceof Element) {
            node.querySelectorAll("video").forEach(v => {
              patchNativeVideoElement(v as HTMLVideoElement);
            });
          }
        }
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src", "controls", VIDEO_RESTRICTION_MARK],
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
