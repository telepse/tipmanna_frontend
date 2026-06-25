import type { Metadata } from "next";
import {
  getDiscoveryFrontendOrigin,
  getPublicAbsoluteUrl,
} from "@/lib/site-config";

const title = "Discover creators, programs & live streams";
const description =
  "Search Tipmanna for community clips, scheduled TV programs, live streams, and trending creator content.";

export const metadata: Metadata = {
  metadataBase: new URL(getDiscoveryFrontendOrigin()),
  title,
  description,
  alternates: {
    canonical: getPublicAbsoluteUrl("/explore"),
  },
  openGraph: {
    title,
    description,
    url: "/discover",
    type: "website",
    siteName: "Tipmanna Discover",
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
    title,
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
