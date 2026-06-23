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
        url: "/icons/icon-512.png",
        width: 512,
        height: 512,
        alt: "Tipmanna",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Discover — Tipmanna",
    description,
    images: ["/icons/icon-512.png"],
  },
};

export default function DiscoverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
