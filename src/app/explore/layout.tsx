import type { Metadata } from "next";

import { getPublicFrontendOrigin } from "@/lib/site-config";

const description =
  "Discover and tip on community clips, live events, and trending videos on Tipmanna.";

export const metadata: Metadata = {
  metadataBase: new URL(getPublicFrontendOrigin()),
  title: "Explore — Tipmanna",
  description,
  alternates: {
    canonical: "/explore",
  },
  openGraph: {
    title: "Explore — Tipmanna",
    description,
    url: "/explore",
    type: "website",
    siteName: "Tipmanna",
    images: [
      {
        url: "/icons/icon-512.png",
        width: 512,
        height: 512,
        alt: "Tipmanna",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Explore — Tipmanna",
    description,
    images: ["/icons/icon-512.png"],
  },
};

export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
