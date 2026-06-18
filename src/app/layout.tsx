import {
  Racing_Sans_One,
  Open_Sans,
  Montserrat,
  Bricolage_Grotesque,
} from "next/font/google";
import "./globals.css";
import Script from "next/script";
import type { Viewport } from "next";

// Third-party imports
import Providers from "@/app/providers";
import { ToastContainer } from "react-toastify";

// Local imports
import { Analytics } from "@/components/analytics";
import { ServiceWorkerRegistrar } from "@/components/pwa/service-worker-registrar";
import { VideoNativeMobileGuard } from "@/components/video-native-mobile-guard";
import { TextTipDraftModalLayer } from "@/components/events/text-tip-draft-modal-layer";

const racingSansOne = Racing_Sans_One({
  variable: "--font-racing",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});
const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
  preload: true,
  display: "swap",
});
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  display: "swap",
});
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "Tipmanna",
  description:
    "Tipmanna is a platform for tippers to tip their favorite hosts.",
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/icon-192.png",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Tipmanna",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

const exploreYtPreload =
  process.env.NEXT_PUBLIC_EXPLORE_YT_PRELOAD === "true" ||
  process.env.NEXT_PUBLIC_EXPLORE_YT_PRELOAD === "1";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
        />
        {exploreYtPreload ? (
          <>
            <link
              rel="preconnect"
              href="https://www.youtube-nocookie.com"
              crossOrigin="anonymous"
            />
            <link
              rel="preconnect"
              href="https://i.ytimg.com"
            />
            <link
              rel="preconnect"
              href="https://www.youtube.com"
            />
          </>
        ) : null}
        <link
          rel="manifest"
          href="/manifest.webmanifest"
        />
        <meta
          name="theme-color"
          content="#000000"
        />
        <meta
          name="apple-mobile-web-app-capable"
          content="yes"
        />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta
          name="apple-mobile-web-app-title"
          content="Tipmanna"
        />
        <link
          rel="apple-touch-startup-image"
          href="/icons/icon-512.png"
        />
      </head>
      <body
        className={`${racingSansOne.variable} ${openSans.variable} ${montserrat.variable} ${bricolage.className} antialiased`}
      >
        <Script
          src="https://cdn.jsdelivr.net/npm/add-to-calendar-button@2"
          strategy="lazyOnload"
        />

        <ToastContainer
          position="bottom-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
          aria-label="Notification messages"
          style={{ zIndex: 2147483647, position: "fixed" }}
        />

        <Providers>
          <VideoNativeMobileGuard />
          <ServiceWorkerRegistrar />
          <Analytics />
          <TextTipDraftModalLayer />

          {children}
        </Providers>
      </body>
    </html>
  );
}
