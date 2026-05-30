"use client";

import { useEffect, useState } from "react";

interface ScreenInfo {
  isLandscape: boolean;
  isMobile: boolean;
  isDesktop: boolean;
}

export function useScreenDetection(): ScreenInfo {
  const [info, setInfo] = useState<ScreenInfo>({
    isLandscape: false,
    isMobile: false,
    isDesktop: false,
  });

  useEffect(() => {
    const check = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isLandscape = width > height;
      const isMobile =
        width <= 768 || ("ontouchstart" in window && width <= 1024);
      const isDesktop = width >= 1024;

      setInfo(prev => {
        if (
          prev.isLandscape === isLandscape &&
          prev.isMobile === isMobile &&
          prev.isDesktop === isDesktop
        ) {
          return prev;
        }
        return { isLandscape, isMobile, isDesktop };
      });
    };

    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);

    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, []);

  return info;
}
