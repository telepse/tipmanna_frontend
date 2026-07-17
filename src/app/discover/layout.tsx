import type { Metadata } from "next";
import { getPrimaryOrigin, getPublicAbsoluteUrl } from "@/lib/site-config";

const title = "Discover creators, programs & live streams";
const description =
  "Search Tipmanna for community clips, scheduled TV programs, live streams, and trending creator content.";

export const metadata: Metadata = {
  metadataBase: new URL(getPrimaryOrigin()),
  title,
  description,
  alternates: {
    canonical: getPublicAbsoluteUrl("/discover"),
  },
  openGraph: {
    title,
    description,
    url: getPublicAbsoluteUrl("/discover"),
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
