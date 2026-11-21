import type { Metadata } from "next";

import { ExploreV2PageLink } from "./explore-v2-page-link.client";
import { getPrimaryOrigin } from "@/lib/site-config";

const title = "Tipmanna TV — Community-powered realtime media 💎";
const description =
  "Discover creators, communities, and live TV experiences where audiences participate, support, and engage together in realtime.";

export const metadata: Metadata = {
  metadataBase: new URL(getPrimaryOrigin()),
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
  return (
    <>
      <ExploreV2PageLink />
      {children}
    </>
  );
}
