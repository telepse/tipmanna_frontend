"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

// Third-party imports
import { Mail, MapPin, Phone } from "lucide-react";
import { CiFacebook, CiLinkedin, CiInstagram } from "react-icons/ci";
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

const supportLinks = [
  { href: "#faq", label: "FAQ" },
  { href: "https://wa.link/9b3ibh", label: "Contact Us" },
  { href: "#community", label: "Community" },
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
  const router = useRouter();
  const [, setIsOpen] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  const { user, isAuthenticated } = useSelector(
    (state: RootState) => state.auth
  );

  // Memoized click handler with proper routing logic
  const handleAddEventClick = useCallback(() => {
    if (!isAuthenticated || !user) {
      router.push("/sign-in");
      return;
    }

    // Use switch for better readability and maintainability
    switch (user.role) {
      case "TIPPER":
        router.push(`/create-account?email=${encodeURIComponent(user.email)}`);
        break;
      case "HOST":
        router.push("/add-event");
        break;
      case "VISITOR":
      default:
        router.push("/sign-in");
        break;
    }
  }, [isAuthenticated, user, router]);

  const handleJoinClick = () => {
    setShowPrompt(true);
  };

  // Memoized click handlers
  const handleAccountClick = useCallback(() => {
    if (!isAuthenticated || !user) {
      router.push("/sign-in");
      return;
    }

    // Use switch for better readability
    switch (user.role) {
      case "TIPPER":
        router.push(`/tipper/${user.username}`);
        break;
      case "HOST":
        router.push(`/host/${user.eventSlug}`);
        break;
      case "VISITOR":
      default:
        router.push("/sign-in");
        break;
    }
  }, [isAuthenticated, user, router]);

  const [openPopup, setOpenPopup] = useState(false);

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
              Enabling content-driven for <br /> charities, content creators,
              and event organisers.
            </Paragraph>

            <div className="text-muted-foreground flex flex-wrap gap-2 text-sm sm:mt-4 lg:mt-0">
              <span className="hidden gap-2 sm:flex lg:hidden">
                <Phone /> +44 79 4473 7986
              </span>
              <span className="hidden gap-2 sm:flex lg:hidden">
                <Mail /> hello@tipmanna.live
              </span>
            </div>
          </div>

          <div className="text-muted-foreground mt-4 flex flex-wrap gap-4 text-sm">
            <span className="flex gap-2 sm:hidden lg:flex">
              <Phone /> +44 79 4473 7986
            </span>
            <span className="flex gap-2 sm:hidden lg:flex">
              <Mail /> hello@tipmanna.live
            </span>
            <span className="flex gap-2 sm:mt-12 lg:mt-0">
              <MapPin /> 190 Corporation St, Birmingham, <br /> B4 6QD, United
              Kingdom
            </span>
          </div>
        </div>

        <div className="col-span-full grid grid-cols-2 gap-4 sm:gap-4 lg:col-span-4">
          {/* Platform */}
          <FooterSection title="Platform">
            <ul className="flex flex-col gap-2 sm:gap-4">
              <li
                className="text-muted-foreground open_sans cursor-pointer text-sm"
                onClick={handleJoinClick}
              >
                Find Event
              </li>

              <li
                className="text-muted-foreground open_sans cursor-pointer text-sm"
                onClick={() => {
                  handleAccountClick();
                  setIsOpen(false); // close menu
                }}
              >
                Live TV
              </li>
              <li
                className="text-muted-foreground open_sans cursor-pointer text-sm"
                onClick={() => setOpenPopup(true)}
              >
                Create
              </li>
            </ul>
          </FooterSection>

          <CreateDialog
            openPopup={openPopup}
            setOpenPopup={setOpenPopup}
          />

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
            router.push("/join");
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
                    className="h-10 w-10 object-cover"
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
