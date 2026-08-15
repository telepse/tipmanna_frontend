"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";

// Third-party imports
import { Mail, MapPin, Phone } from "lucide-react";
import { CiLinkedin, CiInstagram } from "react-icons/ci";
import { FaXTwitter } from "react-icons/fa6";
import { useSelector } from "react-redux";

// Local impoorts
import { Logo } from "@/components/shared/logo";
import { Paragraph } from "@/components/shared/paragraph";
import { LocationPrompt } from "@/components/shared/location-prompt";
import { RootState } from "@/redux/store";
import { FooterSection } from "./footer-section";
import { FooterLinks } from "./footer-links";
import { SocialIcon } from "./social-icon";
import { CreateDialog } from "../home/create-dialog";
import { HostUpgradeDialog } from "@/components/auth/host-upgrade-dialog";
import { getAccountNavHref, getAddEventNavHref } from "@/lib/account-nav-href";
import { useAppRouter } from "@/components/navigation/navigation-progress-provider";

const supportLinks = [
  { href: "#faq", label: "FAQ" },
  { href: "https://wa.link/9b3ibh", label: "Contact Us" },
];

const legalLinks = [
  { href: "#", label: "Privacy Policy" },
  { href: "#", label: "Terms & Condition" },
];

const paymentOptions = [
  "/logos/stripe.png",
  "/logos/stripe-link.png",
  "/logos/google-pay.png",
  "/logos/apple-pay.png",
  "/logos/paypal-logo.png",
];

const currentYear = new Date().getFullYear();

export default function Footer() {
  const { push } = useAppRouter();
  const [showPrompt, setShowPrompt] = useState(false);

  const { user, isAuthenticated } = useSelector(
    (state: RootState) => state.auth
  );

  const addEventHref = useMemo(
    () => getAddEventNavHref(user, isAuthenticated),
    [user, isAuthenticated]
  );

  const accountHref = useMemo(
    () => getAccountNavHref(user, isAuthenticated),
    [user, isAuthenticated]
  );

  const handleJoinClick = () => {
    setShowPrompt(true);
  };

  const [openPopup, setOpenPopup] = useState(false);
  const [hostUpgradeOpen, setHostUpgradeOpen] = useState(false);

  return (
    <footer className="wrapper section">
      <div className="grid grid-cols-12 gap-4 sm:gap-6">
        <div className="col-span-full grid grid-cols-1 items-start sm:grid-cols-2 lg:col-span-4 lg:grid-cols-1">
          <div>
            <Logo />

            <Paragraph
              size="xs"
              color="muted"
            >
              Realtime Community Media Infrastructure
              <br /> Turning content into participation{" "}
              <br className="inline-block sm:hidden" />— and participation into
              shared experience.
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
              <MapPin /> Birmingham, United Kingdom
            </span>
          </div>
        </div>

        <div className="col-span-full grid grid-cols-2 gap-4 sm:gap-4 lg:col-span-4">
          {/* Platform */}
          <FooterSection title="Platform">
            <ul className="flex flex-col gap-2 sm:gap-4">
              <li className="text-muted-foreground open_sans cursor-pointer text-sm">
                <Link
                  href="/tv"
                  prefetch={true}
                >
                  Watch TV
                </Link>
              </li>
              <li className="text-muted-foreground open_sans cursor-pointer text-sm">
                <Link
                  href="/explore"
                  prefetch={true}
                >
                  Explore
                </Link>
              </li>
              <li className="text-muted-foreground open_sans cursor-pointer text-sm">
                <a href="/partner#pricing">Pricing</a>
              </li>
            </ul>
          </FooterSection>

          <CreateDialog
            openPopup={openPopup}
            setOpenPopup={setOpenPopup}
          />

          {user?.role === "TIPPER" && user.email ? (
            <HostUpgradeDialog
              open={hostUpgradeOpen}
              onOpenChange={setHostUpgradeOpen}
              email={user.email}
            />
          ) : null}

          {/* Support */}
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
            <div className="order-3 mt-4 sm:order-1 lg:mt-0">
              <FooterSection title="Payment Partners">
                <div className="-mt-1 inline-flex flex-wrap gap-4">
                  {paymentOptions.map((item, index) => (
                    <Image
                      key={index}
                      src={item}
                      alt={item}
                      width={50}
                      height={50}
                      className="h-10 w-10 object-cover"
                    />
                  ))}
                </div>
              </FooterSection>
            </div>

            <div className="order-1 mt-2 flex items-center gap-4 sm:order-2 lg:mt-4">
              <Paragraph
                size="xs"
                color="muted"
              >
                Follow us on
              </Paragraph>

              <div className="flex gap-2">
                <SocialIcon
                  Icon={CiInstagram}
                  href="https://instagram.com/tipmanna"
                />
                <SocialIcon
                  Icon={CiLinkedin}
                  href="https://linkedin.com/company/tipmanna"
                />
                <SocialIcon
                  Icon={FaXTwitter}
                  href="https://x.com/tipmanna"
                />
              </div>
            </div>

            <Paragraph
              size="xs"
              weight="bold"
              className="racing_sans_one text-primary order-2 sm:order-4 lg:mt-12"
            >
              Watch. Participate. Support. Belong.
            </Paragraph>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-4">
        <Paragraph
          size="xs"
          color="muted"
        >
          &copy;{currentYear} Tipmanna. All rights reserved.
        </Paragraph>

        <div className="-mt-4 flex gap-4 sm:mt-0">
          {legalLinks.map((item, index) => (
            <Link
              href={item.href}
              key={index}
              className="text-muted-foreground open_sans text-sm hover:underline"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
