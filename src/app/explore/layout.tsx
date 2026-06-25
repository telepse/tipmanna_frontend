import type { Metadata } from "next";

import { getPublicFrontendOrigin } from "@/lib/site-config";

const title = "Watch & tip live — Tipmanna TV";
const description =
  "Tipmanna TV is the flagship feed for community clips, live events, and realtime tipping.";

export const metadata: Metadata = {
  metadataBase: new URL(getPublicFrontendOrigin()),
  title,
  description,
  alternates: {
    canonical: "/explore",
  },
  openGraph: {
    title,
    description,
    url: "/explore",
    type: "website",
    siteName: "Tipmanna TV",
    images: [
      {
        url: "/og/explore.svg",
        width: 1200,
        height: 630,
        alt: "Watch and tip live on Tipmanna TV",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og/explore.svg"],
  },
};

export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
