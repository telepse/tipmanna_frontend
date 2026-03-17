import {
  Racing_Sans_One,
  Open_Sans,
  Montserrat,
  Bricolage_Grotesque,
} from "next/font/google";
import "./globals.css";
import Script from "next/script";

// Third-party imports
import Providers from "@/app/providers";
import { ToastContainer } from "react-toastify";

// Local imports
import { Analytics } from "@/components/analytics";
import { VisitorAutoLogoutWrapper } from "@/components/VistorAutoLogoutWrapper";
import TVProvider from "@/components/tv-provider";

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
};

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
      </head>
      <body
        className={`${racingSansOne.variable} ${openSans.variable} ${montserrat.variable} ${bricolage.className} antialiased`}
      >
        <Script
          src="https://cdn.jsdelivr.net/npm/add-to-calendar-button@2"
          async
          defer
        ></Script>

        <Providers>
          <VisitorAutoLogoutWrapper>
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
            />
          </VisitorAutoLogoutWrapper>
          <Analytics />

          <TVProvider>{children}</TVProvider>
        </Providers>
      </body>
    </html>
  );
}
