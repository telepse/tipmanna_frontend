import type { Metadata } from "next";
import { getDiscoveryFrontendOrigin } from "@/lib/site-config";

const description =
  "Search and discover community clips, live streams, programs, and trending videos on Tipmanna.";

export const metadata: Metadata = {
  metadataBase: new URL(getDiscoveryFrontendOrigin()),
  title: "Discover — Tipmanna",
  description,
  alternates: {
    canonical: "/discover",
  },
  openGraph: {
    title: "Discover — Tipmanna",
    description,
    url: "/discover",
    type: "website",
    siteName: "Tipmanna",
    images: [
      {
        url: "/og/discover.svg",
        width: 1200,
        height: 630,
        alt: "Discover Tipmanna",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Discover — Tipmanna",
    description,
    images: ["/og/discover.svg"],
  },
};

export default function DiscoverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
