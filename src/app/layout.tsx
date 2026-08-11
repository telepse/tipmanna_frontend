import {
  Racing_Sans_One,
  Open_Sans,
  Montserrat,
  Bricolage_Grotesque,
} from "next/font/google";
import "./globals.css";
import Script from "next/script";
import type { Viewport } from "next";
import { Suspense } from "react";

// Third-party imports
import Providers from "@/app/providers";
import { ToastContainer } from "react-toastify";

// Local imports
import { WebVitalsReporter } from "@/components/analytics/web-vitals-reporter";
import { ServiceWorkerRegistrar } from "@/components/pwa/service-worker-registrar";
import { VideoNativeMobileGuard } from "@/components/video-native-mobile-guard";
import { TextTipDraftModalLayer } from "@/components/events/text-tip-draft-modal-layer";
import HashScroll from "@/components/home/hash-scroll";

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
  title: "Tipmanna TV — Community-powered realtime media 💎",
  description:
    "Discover creators, communities, and live TV experiences where audiences participate, support, and engage together in realtime.",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
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
          rel="apple-touch-icon"
          href="/apple-touch-icon.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="192x192"
          href="/icons/icon-192.png"
        />
        <link
          rel="apple-touch-startup-image"
          href="/icons/icon-512.png"
        />
        <Script
          id="gtm-script"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-NNDJ85BT');`,
          }}
        ></Script>
      </head>
      <body
        className={`${racingSansOne.variable} ${openSans.variable} ${montserrat.variable} ${bricolage.className} antialiased`}
      >
        {/* <!-- Google Tag Manager (noscript) --> */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-NNDJ85BT"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          ></iframe>
        </noscript>
        {/* <!-- End Google Tag Manager (noscript) --> */}

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

          <WebVitalsReporter />
          <TextTipDraftModalLayer />

          <Suspense fallback={null}>
            <HashScroll />
          </Suspense>

          {children}
        </Providers>
      </body>
    </html>
  );
}
