"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "";

export const Analytics = () => {
  const pathname = usePathname();

  useEffect(() => {
    if (
      !GA_ID ||
      typeof window === "undefined" ||
      typeof window.gtag !== "function"
    ) {
      return;
    }
    window.gtag("config", GA_ID, { page_path: pathname });
  }, [pathname]);

  if (!GA_ID) return null;

  return (
    <Script
      id="gtag-js"
      src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
      strategy="lazyOnload"
      onLoad={() => {
        window.dataLayer = window.dataLayer || [];
        window.gtag = function gtag(...args: unknown[]) {
          window.dataLayer!.push(args);
        };
        window.gtag("js", new Date());
        window.gtag("config", GA_ID);
      }}
    />
  );
};
