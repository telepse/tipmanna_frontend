"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";

// Third-party imports
import { ChevronDown, ChevronUp, Mail, MapPin, Phone } from "lucide-react";
import { CiFacebook, CiLinkedin, CiInstagram } from "react-icons/ci";
import { FaXTwitter } from "react-icons/fa6";
import { useSelector } from "react-redux";

// Local imports
import { Logo } from "../shared/logo";
import { Paragraph } from "../shared/paragraph";
import { FooterSection } from "../shared/footer-section";
import { FooterLinks } from "../shared/footer-links";
import { SocialIcon } from "../shared/social-icon";
import { RootState } from "@/redux/store";
import { LocationPrompt } from "../shared/location-prompt";
import {
  getDashboardFooterAccountHref,
  getDashboardFooterCreateHref,
} from "@/lib/account-nav-href";
import { useAppRouter } from "@/components/navigation/navigation-progress-provider";

const supportLinks = [
  { href: "/partner#faq", label: "FAQ" },
  { href: "https://wa.link/9b3ibh", label: "Contact Us" },
  { href: "#community", label: "Community" },
];

const paymentOptions = [
  "/logos/stripe.png",
  "/logos/stripe-link.png",
  "/logos/google-pay.png",
  "/logos/apple-pay.png",
];

export const DashboardFooter = () => {
  const { push } = useAppRouter();
  const [, setIsOpen] = useState(false);

  const { user, isAuthenticated } = useSelector(
    (state: RootState) => state.auth
  );

  const [showPrompt, setShowPrompt] = useState(false);
  const [collapsed, setCollapsed] = useState(true); // HIDDEN by default

  const createHref = useMemo(
    () => getDashboardFooterCreateHref(user, isAuthenticated),
    [user, isAuthenticated]
  );

  const accountHref = useMemo(
    () => getDashboardFooterAccountHref(user, isAuthenticated),
    [user, isAuthenticated]
  );

  const handleJoinClick = () => setShowPrompt(true);

  return (
    <footer className="wrapper section relative flex flex-col">
      {/* Footer Content */}
      <div
        className={`transition-max-height overflow-hidden duration-300 ${
          collapsed ? "max-h-0 opacity-0" : "max-h-[2000px] opacity-100"
        }`}
      >
        <div className="bg-card z-50 grid grid-cols-12 gap-4 rounded-md border p-4 sm:gap-6">
          <div className="col-span-full grid grid-cols-1 items-start sm:grid-cols-2 lg:col-span-4 lg:grid-cols-1">
            <div>
              <Logo />
              <Paragraph
                size="xs"
                color="muted"
              >
                Enabling fun-filled digital transactions for <br /> fundraising,
                donating, and tipping at events.
              </Paragraph>

              <div className="text-muted-foreground flex flex-wrap gap-2 text-sm sm:mt-4 lg:mt-0">
                <span className="hidden gap-2 sm:flex lg:hidden">
                  <Phone /> +44 79 4473 7986
                </span>
                <span className="hidden gap-2 sm:flex lg:hidden">
                  <Mail /> hello@tipmanna.tv
                </span>
              </div>
            </div>

            <div className="text-muted-foreground mt-4 flex flex-wrap gap-4 text-sm">
              <span className="flex gap-2 sm:hidden lg:flex">
                <Phone /> +44 79 4473 7986
              </span>
              <span className="flex gap-2 sm:hidden lg:flex">
                <Mail /> hello@tipmanna.tv
              </span>
              <span className="flex gap-2 sm:mt-12 lg:mt-0">
                <MapPin /> 190 Corporation St, Birmingham, <br /> B4 6QD, United
                Kingdom
              </span>
            </div>
          </div>

          <div className="col-span-full grid grid-cols-2 gap-4 sm:gap-4 lg:col-span-4">
            <FooterSection title="Platform">
              <ul className="flex flex-col gap-2 sm:gap-4">
                <span
                  className="text-muted-foreground open_sans cursor-pointer text-sm"
                  onClick={handleJoinClick}
                >
                  Join Event
                </span>
                <Link
                  href={createHref}
                  prefetch={true}
                  className="text-muted-foreground open_sans cursor-pointer text-sm"
                >
                  Create Event
                </Link>
                <Link
                  href={accountHref}
                  prefetch={true}
                  className="text-muted-foreground open_sans cursor-pointer text-sm"
                  onClick={() => setIsOpen(false)}
                >
                  My Account
                </Link>
              </ul>
            </FooterSection>

            <FooterSection title="Support">
              <FooterLinks links={supportLinks} />
            </FooterSection>
          </div>

          <LocationPrompt
            open={showPrompt}
            onAllow={country => {
              console.log("Allowed in", country);
              setShowPrompt(false);
            }}
            onDeny={() => {
              setShowPrompt(false);
              push("/join");
            }}
            onClose={() => setShowPrompt(false)}
          />

          <div className="col-span-full lg:col-span-4">
            <div className="grid grid-cols-1 items-start sm:grid-cols-2 lg:grid-cols-1">
              <FooterSection title="Payment Partners">
                <div className="-mt-1 inline-flex flex-wrap gap-4">
                  {paymentOptions.map((item, index) => (
                    <Image
                      key={index}
                      src={item}
                      alt={item}
                      width={50}
                      height={50}
                      className="h-8 w-10 object-cover"
                    />
                  ))}
                </div>
              </FooterSection>

              <div className="mt-4 flex items-center gap-4">
                <Paragraph
                  size="xs"
                  color="muted"
                >
                  Follow us on
                </Paragraph>
                <div className="flex gap-2">
                  <SocialIcon
                    Icon={CiFacebook}
                    href="https://instagram.com/tipmanna"
                  />
                  <SocialIcon
                    Icon={FaXTwitter}
                    href="https://x.com/tipmanna"
                  />
                  <SocialIcon
                    Icon={CiInstagram}
                    href="https://instagram.com/tipmanna"
                  />
                  <SocialIcon
                    Icon={CiLinkedin}
                    href="https://linkedin.com/company/tipmanna"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chevron always visible at bottom */}
      <div
        className="fixed right-4 bottom-24 flex cursor-pointer justify-end rounded-full bg-black p-2 md:bottom-16"
        onClick={() => setCollapsed(prev => !prev)}
      >
        {collapsed ? (
          <ChevronUp className="size-4 text-white" />
        ) : (
          <ChevronDown className="size-4 text-white" />
        )}
      </div>
    </footer>
  );
};
