import React from "react";
import { getTvYoutubeSsrPreconnectLinks } from "@/lib/tv-youtube-preconnect-config";

/**
 * Phase C2.1 — Server-rendered YouTube connection hints for the TV route only.
 * Link tags are hoisted to `<head>` by the App Router (no hydration wait).
 */
export function TvYoutubeSsrPreconnect() {
  const links = getTvYoutubeSsrPreconnectLinks();
  if (links.length === 0) return null;

  return (
    <>
      {links.map(link => (
        <link
          key={`${link.rel}:${link.href}`}
          rel={link.rel}
          href={link.href}
          {...(link.crossOrigin ? { crossOrigin: link.crossOrigin } : {})}
        />
      ))}
    </>
  );
}
