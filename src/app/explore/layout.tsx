import type { Metadata } from "next";

import { getPublicFrontendOrigin } from "@/lib/site-config";

const description =
  "Discover creators, communities, and live TV experiences where audiences participate, support, and engage together in realtime.";

export const metadata: Metadata = {
  metadataBase: new URL(getPublicFrontendOrigin()),
  title: "Tipmanna TV — Community-powered realtime media",
  description,
  alternates: {
    canonical: "/explore",
  },
  openGraph: {
    title: "Tipmanna TV — Community-powered realtime media",
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
    title: "Tipmanna TV — Community-powered realtime media",
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
