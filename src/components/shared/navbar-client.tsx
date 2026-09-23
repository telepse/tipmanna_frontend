"use client";

import { useState, useEffect, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";

// Third-party imports
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSelector } from "react-redux";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Local imports
import { Logo } from "./logo";
import { RootState } from "@/redux/store";
import { getAccountNavHref } from "@/lib/account-nav-href";
import { useSideChick } from "@/components/community/side-chick-provider";

export default function NavbarClient() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [dedicatedModalOpen, setDedicatedModalOpen] = useState(false);
  const [exitBusy, setExitBusy] = useState(false);

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sideChick = useSideChick();

  const { user, isAuthenticated } = useSelector(
    (state: RootState) => state.auth
  );

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 100);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const accountHref = useMemo(
    () => getAccountNavHref(user, isAuthenticated),
    [user, isAuthenticated]
  );

  const communityFeatureEnabled =
    process.env.NEXT_PUBLIC_COMMUNITY_FEATURE_ENABLED === "true";

  const communityExploreActive =
    pathname === "/explore" && searchParams.get("tab") === "my-communities";

  const headerTint =
    communityFeatureEnabled &&
    sideChick.active &&
    sideChick.activation?.customization?.headerColor
      ? sideChick.activation.customization.headerColor
      : null;

  return (
    <header
      className={`sticky top-0 z-50 bg-white transition-shadow ${
        headerTint ? "" : "bg-white"
      } ${isScrolled ? "shadow" : ""}`}
      aria-label="Main navigation"
    >
      <div className="wrapper flex items-center justify-between p-4">
        <div className="flex min-w-0 items-center gap-2">
          <Logo />
        </div>

        {/* Desktop nav */}
        <nav
          className="hidden gap-6 lg:flex"
          aria-label="Main menu"
        >
          <Link
            href="/tv"
            prefetch={true}
            className={`hover:text-primary open_sans ${pathname === "/tv" ? "text-primary" : ""}`}
          >
            Watch TV
          </Link>
          <Link
            href="/explore"
            prefetch={true}
            className={`hover:text-primary open_sans ${pathname === "/explore" ? "text-primary" : ""}`}
          >
            Explore
          </Link>
          {communityFeatureEnabled ? (
            <Link
              href="/explore?tab=my-communities"
              prefetch={true}
              className={`hover:text-primary open_sans ${communityExploreActive ? "text-primary" : ""}`}
            >
              Communities
            </Link>
          ) : null}
          <Link
            href="/partner#pricing"
            className={`hover:text-primary open_sans`}
          >
            Pricing
          </Link>

          <Link
            href="/partner#faq"
            className={`hover:text-primary open_sans`}
          >
            FAQs
          </Link>
        </nav>

        {/* Desktop buttons */}
        <div className="hidden gap-4 lg:flex">
          <Link href="mailto:hello@tipmanna.tv">
            <Button
              variant="outline"
              asChild
              aria-label="Request a demo via email"
            >
              <a href="https://calendly.com/partner-telepse/tipmanna-session">
                Request Demo
              </a>
            </Button>
          </Link>

          <Button asChild>
            <Link
              href={accountHref}
              prefetch={true}
            >
              My Account
            </Link>
          </Button>
        </div>

        {/* Mobile menu toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-controls="mobile-menu"
          aria-label={isOpen ? "Close menu" : "Open menu"}
        >
          {isOpen ? (
            <X
              className="size-8"
              aria-hidden="true"
            />
          ) : (
            <Menu
              className="size-8"
              aria-hidden="true"
            />
          )}
        </Button>
      </div>

      {/* AnimatePresence handles mounting/unmounting */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="mobile-menu"
            className="fixed inset-0 top-16 z-40 bg-black/20 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setIsOpen(false)} // close on backdrop click
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation menu"
          >
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ duration: 0.3 }}
              onClick={e => e.stopPropagation()} // prevent closing when clicking inside
            >
              <div className="flex flex-col gap-4 bg-white p-4 lg:hidden">
                {/* Mobile nav */}

                <Link
                  href="/explore"
                  prefetch={true}
                  className={`hover:text-primary open_sans ${pathname === "/explore" ? "text-primary" : ""}`}
                >
                  Explore
                </Link>

                <Link
                  href="/tv"
                  prefetch={true}
                  className={`open_sans ${pathname === "/tv" ? "" : ""}`}
                >
                  Watch TV
                </Link>

                {communityFeatureEnabled ? (
                  <Link
                    href="/explore?tab=my-communities"
                    prefetch={true}
                    className={`open_sans ${communityExploreActive ? "text-primary" : ""}`}
                  >
                    Community
                  </Link>
                ) : null}

                <Link
                  href="/partner#pricing"
                  className={`hover:text-primary open_sans`}
                >
                  Pricing
                </Link>

                <Link
                  href="/partner#faq"
                  className={`hover:text-primary open_sans`}
                >
                  FAQs
                </Link>

                {/* Mobile buttons */}
                <div className="flex flex-col gap-4">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full"
                  >
                    <a href="https://calendly.com/partner-telepse/tipmanna-session">
                      Request Demo
                    </a>
                  </Button>
                  <Button
                    className="w-full"
                    size="lg"
                    asChild
                  >
                    <Link
                      href={accountHref}
                      prefetch={true}
                      onClick={() => setIsOpen(false)}
                    >
                      My Account
                    </Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog
        open={dedicatedModalOpen}
        onOpenChange={setDedicatedModalOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dedicated community mode</DialogTitle>
            <DialogDescription>
              You are focused on{" "}
              <span className="text-foreground font-medium">
                {sideChick.activation?.community.name ?? "your community"}
              </span>
              . Trends, Saves, and Live TV on Explore are limited to that
              community until you reactivate Tipmanna Public and your other feed
              settings.
            </DialogDescription>
          </DialogHeader>
          <Button
            type="button"
            disabled={exitBusy}
            onClick={() => {
              setExitBusy(true);
              void sideChick
                .exitDedicatedMode()
                .then(ok => {
                  if (ok) setDedicatedModalOpen(false);
                })
                .finally(() => setExitBusy(false));
            }}
          >
            Reactivate Tipmanna Public (exit dedicated mode)
          </Button>
        </DialogContent>
      </Dialog>
    </header>
  );
}
